import ExcelJS from 'exceljs'
import { db, CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, STATUSES } from '../db'
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
  payment: ['결제', '결제방법', '결제 방법', 'payment'],
  settled: ['외상갚음', '외상 갚음', '갚음', 'settled'],
  salePrice: ['판매가', '파는 가격', '판매 가격', 'sale price', 'saleprice'],
  memo: ['메모', '비고', 'memo'],
}

/**
 * @param {File} file
 * @param {'overwrite' | 'merge'} mode
 * @returns {Promise<{ shops: number, items: number, entries: number, skipped: number }>}
 */
export async function importHistoryFromExcel(file, mode = 'merge') {
  const workbook = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await workbook.xlsx.load(buffer)

  const sheet =
    workbook.getWorksheet('사입장부') ||
    workbook.worksheets.find((ws) => !['요약', '가게', '가계부'].includes(ws.name)) ||
    workbook.worksheets[0]
  const shopInfo = readShopSheet(workbook.getWorksheet('가게'))
  // 앱이 내보낸 엑셀의 「가계부」 시트 (없으면 가계부 기록은 건드리지 않음)
  const ledgerSheet = workbook.getWorksheet('가계부')
  const ledgerRows = readLedgerSheet(ledgerSheet)

  if (!sheet) {
    throw new Error('엑셀 시트를 찾을 수 없습니다')
  }

  const rows = []
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rows.push({ rowNumber, values: row.values })
  })

  if (rows.length < 2 && ledgerRows.length === 0) {
    throw new Error('불러올 데이터가 없습니다')
  }

  const headerMap = buildHeaderMap(rows[0]?.values ?? [])
  if (headerMap.name == null && headerMap.shop == null && ledgerRows.length === 0) {
    throw new Error('엑셀 첫 줄에 「품명」 또는 「가게」 열이 필요합니다')
  }

  const parsed = []
  for (const { values: raw } of headerMap.name == null && headerMap.shop == null ? [] : rows.slice(1)) {
    // 예전 앱이 내보낸 엑셀은 내용이 제목보다 한 칸 오른쪽에 있음 → 한 칸 당겨 읽기
    const shifted =
      headerMap.date === 1 &&
      headerMap.shop === 2 &&
      cellToString(raw[1]).trim() === '' &&
      parseDateCell(raw[2])
    const values = shifted ? raw.slice(1) : raw
    const record = parseDataRow(values, headerMap)
    if (record) parsed.push(record)
  }

  if (parsed.length === 0 && ledgerRows.length === 0) {
    throw new Error('유효한 행이 없습니다. 품명 또는 가게가 있는 행이 필요합니다')
  }

  let shopCount = 0
  let itemCount = 0
  let skipped = 0
  let entryCount = 0

  await db.transaction('rw', [db.shops, db.items, db.photos, db.entries, db.deletions], async () => {
    if (mode === 'overwrite') {
      await rememberReplacedRecords(new Set(), { entries: Boolean(ledgerSheet) })
      await db.photos.clear()
      await db.items.clear()
      await db.shops.clear()
      if (ledgerSheet) await db.entries.clear()
    }

    const existingEntries = new Set()
    if (mode === 'merge') for (const entry of await db.entries.toArray()) existingEntries.add(entryKey(entry))
    for (const entry of ledgerRows) {
      if (existingEntries.has(entryKey(entry))) {
        skipped += 1
        continue
      }
      existingEntries.add(entryKey(entry))
      const now = Date.now()
      await db.entries.add({ ...entry, createdAt: now, dirty: 1, updatedAt: now })
      entryCount += 1
    }

    const shopCache = new Map()
    // 같은 엑셀을 두 번 더해도 겹치지 않게, 이미 있는 기록은 건너뜀
    const existingItems = new Set()
    if (mode === 'merge') {
      const existing = await db.shops.toArray()
      for (const shop of existing) {
        shopCache.set(shopKey(shop.name, shop.building, shop.floor, shop.unit), shop.id)
      }
      for (const item of await db.items.toArray()) existingItems.add(itemKey(item.shopId, item))
    }

    for (const record of parsed) {
      const key = shopKey(record.shopName, record.building, record.floor, record.unit)
      let shopId = shopCache.get(key)

      if (!shopId) {
        const info = shopInfo.get(key) ?? {}
        shopId = await db.shops.add({
          name: record.shopName,
          building: record.building,
          floor: record.floor,
          unit: record.unit,
          phone: info.phone ?? '',
          memo: info.memo ?? '',
          hidden: info.hidden ? 1 : 0,
          lastVisitedAt: Date.now(),
        })
        shopCache.set(key, shopId)
        shopCount += 1
      }

      if (existingItems.has(itemKey(shopId, record))) {
        skipped += 1
        continue
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
        payment: record.payment,
        settled: record.settled ? 1 : 0,
        salePrice: record.salePrice,
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
  return { shops: shopCount, items: itemCount, entries: entryCount, skipped }
}

/** 「가계부」 시트: 날짜·구분·분류·금액·결제·메모 */
function readLedgerSheet(sheet) {
  const rows = []
  if (!sheet) return rows
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const amount = parseNumber(row.getCell(4).value)
    if (!amount) return
    const type = /수입|들어온|income/i.test(cellToString(row.getCell(2).value)) ? 'income' : 'expense'
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    const rawCategory = cellToString(row.getCell(3).value).trim()
    const payment = type === 'expense' ? parsePayment(cellToString(row.getCell(5).value)) : ''
    rows.push({
      type,
      date: parseDateCell(row.getCell(1).value) || getToday(),
      amount,
      category: categories.includes(rawCategory) ? rawCategory : categories[categories.length - 1],
      payment: payment === '외상' ? '' : payment,
      memo: cellToString(row.getCell(6).value).trim(),
    })
  })
  return rows
}

function entryKey(entry) {
  return [entry.type, entry.date, entry.amount, entry.category, entry.memo || '']
    .map((v) => String(v ?? '').trim())
    .join('|')
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
    payment: parsePayment(cellToString(values[headerMap.payment])),
    salePrice: headerMap.salePrice == null ? 0 : parseNumber(values[headerMap.salePrice]),
    settled: /^(o|y|yes|1|true|예|v|✓|✔|갚음)$/i.test(cellToString(values[headerMap.settled]).trim()),
    // ★·O·1·Y·예처럼 무엇이든 적혀 있으면 별표
    starred: /^(★|\*|o|y|yes|1|true|예|v|✓|✔)$/i.test(cellToString(values[headerMap.starred]).trim()),
    memo: cellToString(values[headerMap.memo]).trim(),
  }
}

const FLOOR_RE = /^(B\d+F?|\d+\s*F|\d+\s*층|지하\s*\d*\s*층?)$/i
const UNIT_RE = /^[A-Z]{0,2}\s*-?\s*\d+[A-Z]?(호)?$/i

/** 「청평화 · 3F · A-123」을 상가·층·호수로. 앱이 내보낸 엑셀은 「·」로만 나눠 상가 이름 속 「/」를 지킴 */
function parseLocation(raw) {
  const result = { building: '', floor: '', unit: '' }
  if (!raw) return result
  const parts = raw
    .split(raw.includes('·') ? '·' : /[|/]/)
    .map((part) => part.trim())
    .filter(Boolean)
  for (const part of parts) {
    if (!result.floor && FLOOR_RE.test(part)) result.floor = part
    else if (!result.unit && (result.building || result.floor) && UNIT_RE.test(part)) result.unit = part
    else if (!result.building) result.building = part
    else if (!result.floor) result.floor = part
    else if (!result.unit) result.unit = part
  }
  return result
}

/** 엑셀의 「가게」 시트(앱이 내보낸 것)에서 전화·메모·숨김 */
function readShopSheet(sheet) {
  const info = new Map()
  if (!sheet) return info
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const name = cellToString(row.getCell(1).value).trim()
    if (!name) return
    const { building, floor, unit } = parseLocation(cellToString(row.getCell(2).value))
    info.set(shopKey(name, building, floor, unit), {
      phone: cellToString(row.getCell(3).value).trim(),
      memo: cellToString(row.getCell(4).value).trim(),
      hidden: /^(o|y|1|예|true|✓)$/i.test(cellToString(row.getCell(5).value).trim()),
    })
  })
  return info
}

function parsePayment(raw) {
  const text = raw.trim().replace(/\s/g, '')
  if (!text) return ''
  if (/외상|미수|후불/.test(text)) return '외상'
  if (/카드/.test(text)) return '카드'
  if (/이체|계좌|송금/.test(text)) return '계좌이체'
  if (/현금/.test(text)) return '현금'
  return ''
}

function itemKey(shopId, item) {
  return [
    shopId,
    item.date,
    item.name,
    item.price,
    item.qty,
    item.color || '',
    item.size || '',
    item.memo || '',
  ]
    .map((v) => String(v ?? '').trim())
    .join('|')
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
  return [name, building, floor, unit]
    .map((v) =>
      String(v || '')
        .trim()
        .toLowerCase(),
    )
    .join('|')
}

function toYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
