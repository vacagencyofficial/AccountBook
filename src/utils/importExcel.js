import ExcelJS from 'exceljs'
import { db, CATEGORIES, STATUSES } from '../db'
import { rememberReplacedRecords } from '../db/mutations'
import { getToday } from './format'

const HEADER_ALIASES = {
  date: ['날짜', '일자', 'date'],
  shop: ['가게', '매장', '가게명', 'shop'],
  location: ['상가위치', '위치', '상가', 'location'],
  name: ['품명', '상품명', '상품', '이름', 'name'],
  category: ['카테고리', '분류', 'category'],
  color: ['색상', '컬러', 'color'],
  size: ['사이즈', '호수', 'size'],
  price: ['단가', '가격', 'price'],
  qty: ['수량', '수량(장)', 'qty', 'quantity'],
  status: ['상태', 'status'],
  starred: ['별표', '즐겨찾기', 'star', 'starred'],
  memo: ['메모', '비고', 'memo'],
}

/**
 * @param {File} file
 * @param {'overwrite' | 'merge'} mode
 * @returns {Promise<{ shops: number, items: number }>}
 */
export async function importHistoryFromExcel(file, mode = 'merge') {
  const workbook = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await workbook.xlsx.load(buffer)

  const sheet =
    workbook.getWorksheet('사입장부') ||
    workbook.worksheets.find((ws) => ws.name !== '요약') ||
    workbook.worksheets[0]

  if (!sheet) {
    throw new Error('엑셀 시트를 찾을 수 없습니다')
  }

  const rows = []
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rows.push({ rowNumber, values: row.values })
  })

  if (rows.length < 2) {
    throw new Error('불러올 데이터가 없습니다')
  }

  const headerMap = buildHeaderMap(rows[0].values)
  if (headerMap.name == null && headerMap.shop == null) {
    throw new Error('엑셀 첫 줄에 「품명」 또는 「가게」 열이 필요합니다')
  }

  const parsed = []
  for (const { values } of rows.slice(1)) {
    const record = parseDataRow(values, headerMap)
    if (record) parsed.push(record)
  }

  if (parsed.length === 0) {
    throw new Error('유효한 행이 없습니다. 품명 또는 가게가 있는 행이 필요합니다')
  }

  let shopCount = 0
  let itemCount = 0

  await db.transaction('rw', [db.shops, db.items, db.photos, db.deletions], async () => {
    if (mode === 'overwrite') {
      await rememberReplacedRecords()
      await db.photos.clear()
      await db.items.clear()
      await db.shops.clear()
    }

    const shopCache = new Map()
    if (mode === 'merge') {
      const existing = await db.shops.toArray()
      for (const shop of existing) {
        shopCache.set(shopKey(shop.name, shop.building, shop.floor, shop.unit), shop.id)
      }
    }

    for (const record of parsed) {
      const key = shopKey(record.shopName, record.building, record.floor, record.unit)
      let shopId = shopCache.get(key)

      if (!shopId) {
        shopId = await db.shops.add({
          name: record.shopName,
          building: record.building,
          floor: record.floor,
          unit: record.unit,
          phone: '',
          memo: '',
          lastVisitedAt: Date.now(),
        })
        shopCache.set(key, shopId)
        shopCount += 1
      }

      await db.items.add({
        shopId,
        date: record.date,
        name: record.name,
        category: record.category,
        color: record.color,
        size: record.size,
        price: record.price,
        qty: record.qty,
        memo: record.memo,
        status: record.status,
        starred: record.starred ? 1 : 0,
        createdAt: Date.now(),
      })
      itemCount += 1
    }
  })

  try {
    const { syncAfterWrite } = await import('../db/cloudSync')
    void syncAfterWrite()
  } catch {
    // offline / unconfigured cloud — local import still succeeded
  }
  return { shops: shopCount, items: itemCount }
}

function buildHeaderMap(values) {
  const map = {}
  for (let col = 1; col < values.length; col++) {
    const label = normalizeHeader(cellToString(values[col]))
    if (!label) continue
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((alias) => normalizeHeader(alias) === label)) {
        map[field] = col
      }
    }
  }
  return map
}

function parseDataRow(values, headerMap) {
  const shopName = cellToString(values[headerMap.shop]).trim() || '미지정'
  const name = cellToString(values[headerMap.name]).trim()
  if (!name && shopName === '미지정') return null
  if (!name && !shopName) return null

  const locationRaw = cellToString(values[headerMap.location])
  const { building, floor, unit } = parseLocation(locationRaw)

  let category = cellToString(values[headerMap.category]).trim() || '기타'
  if (!CATEGORIES.includes(category)) category = '기타'

  let status = cellToString(values[headerMap.status]).trim() || '구매'
  if (!STATUSES.includes(status)) status = '구매'

  const price = parseNumber(values[headerMap.price])
  const qty = Math.max(1, parseNumber(values[headerMap.qty]) || 1)

  return {
    date: parseDateCell(values[headerMap.date]) || getToday(),
    shopName,
    building,
    floor,
    unit,
    name: name || '(품명 없음)',
    category,
    color: cellToString(values[headerMap.color]).trim(),
    size: cellToString(values[headerMap.size]).trim(),
    price,
    qty,
    status,
    // ★·O·1·Y·예처럼 무엇이든 적혀 있으면 별표
    starred: /^(★|\*|o|y|yes|1|true|예|v|✓|✔)$/i.test(cellToString(values[headerMap.starred]).trim()),
    memo: cellToString(values[headerMap.memo]).trim(),
  }
}

function parseLocation(raw) {
  if (!raw) return { building: '', floor: '', unit: '' }
  const parts = raw
    .split(/[·|/]/)
    .map((part) => part.trim())
    .filter(Boolean)
  return {
    building: parts[0] || '',
    floor: parts[1] || '',
    unit: parts[2] || '',
  }
}

function parseDateCell(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toYmd(value)
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    // Excel serial date (approx)
    const utc = Math.round((value - 25569) * 86400 * 1000)
    return toYmd(new Date(utc))
  }
  const text = cellToString(value).trim()
  if (!text) return ''

  const iso = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }

  const kr = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (kr) {
    return `${kr[1]}-${kr[2].padStart(2, '0')}-${kr[3].padStart(2, '0')}`
  }

  const parsed = Date.parse(text)
  if (!Number.isNaN(parsed)) return toYmd(new Date(parsed))
  return ''
}

function parseNumber(value) {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Math.round(value)
  const text = cellToString(value).replace(/[,\s원]/g, '')
  const n = Number(text)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function cellToString(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return toYmd(value)
  if (typeof value === 'object') {
    if (value.text != null) return String(value.text)
    if (value.result != null) return cellToString(value.result)
    if (value.richText) return value.richText.map((t) => t.text).join('')
  }
  return String(value)
}

function normalizeHeader(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

function shopKey(name, building, floor, unit) {
  return [name, building, floor, unit].map((v) => String(v || '').trim().toLowerCase()).join('|')
}

function toYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
