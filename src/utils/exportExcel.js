import ExcelJS from 'exceljs'
import { getToday, itemTotal, shopLocation } from './format'
import { isUnpaidCredit, itemProfit } from './analytics'
import { ledgerByMonth, ledgerDate, monthKeyOf, summarizeLedger } from './ledger'

function downloadBlob(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  // 화면에 붙여 눌러야 파일 이름이 지켜지고, 주소는 내려받기가 시작된 뒤에 정리
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** entries: 가계부(사입 말고 다른 지출·수입). 주면 「가계부」 시트를 만듦 */
export async function exportHistoryToExcel(
  items,
  { includePhotos = false, fileLabel = '', entries = null } = {},
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '사입노트'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('사입장부', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // 칸 목록: 제목·너비·값을 한곳에서 (칸을 더하거나 옮겨도 숫자 서식·사진 위치가 따라감)
  const money = '#,##0'
  const columns = [
    { header: '날짜', width: 12, value: (item) => item.date },
    { header: '가게', width: 14, value: (item) => item.shop?.name ?? '' },
    { header: '상가위치', width: 18, value: (item) => shopLocation(item.shop) },
    { header: '품명', width: 18, value: (item) => item.name },
    { header: '카테고리', width: 10, value: (item) => item.category || '기타' },
    { header: '색상', width: 10, value: (item) => item.color || '' },
    { header: '사이즈', width: 8, value: (item) => item.size || '' },
    { header: '단가', width: 12, numFmt: money, value: (item) => Number(item.price) || 0 },
    { header: '수량', width: 8, numFmt: money, value: (item) => Number(item.qty) || 0 },
    { header: '합계', width: 12, numFmt: money, value: (item) => itemTotal(item) },
    { header: '판매가', width: 12, numFmt: money, value: (item) => Number(item.salePrice) || '' },
    { header: '남는돈', width: 12, numFmt: money, value: (item) => (item.salePrice ? itemProfit(item) : '') },
    { header: '상태', width: 8, value: (item) => item.status || '구매' },
    { header: '별표', width: 6, center: true, value: (item) => (item.starred ? '★' : '') },
    { header: '결제', width: 9, value: (item) => item.payment || '' },
    {
      header: '외상갚음',
      width: 9,
      center: true,
      value: (item) => (item.payment === '외상' ? (item.settled ? 'O' : 'X') : ''),
    },
    { header: '메모', width: 24, value: (item) => item.memo || '' },
  ]
  const headers = columns.map((column) => column.header)
  if (includePhotos) headers.push('사진')
  const starCol = headers.indexOf('별표') + 1
  const photoCol = headers.indexOf('사진')

  sheet.addRow(headers)
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF111111' },
  }
  header.alignment = { vertical: 'middle', horizontal: 'center' }
  header.height = 22

  sheet.columns = [
    ...columns.map((column) => ({ width: column.width })),
    ...(includePhotos ? [{ width: 14 }] : []),
  ]

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const rowNumber = i + 2
    const row = sheet.getRow(rowNumber)
    // 배열 첫 칸이 A열 (앞에 빈칸을 두면 한 칸씩 밀림)
    row.values = columns.map((column) => column.value(item))
    row.alignment = { vertical: 'middle' }
    columns.forEach((column, index) => {
      const cell = row.getCell(index + 1)
      if (column.numFmt) cell.numFmt = column.numFmt
      if (column.center) cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
    if (item.starred) row.getCell(starCol).font = { color: { argb: 'FFF59E0B' }, bold: true }

    if (includePhotos && item.photo?.blob) {
      try {
        row.height = 70
        const buffer = await item.photo.blob.arrayBuffer()
        const imageId = workbook.addImage({
          buffer,
          extension: 'jpeg',
        })
        sheet.addImage(imageId, {
          tl: { col: photoCol, row: rowNumber - 1 },
          ext: { width: 72, height: 72 },
        })
      } catch {
        // skip broken photo
      }
    }
  }

  const summary = workbook.addWorksheet('요약')
  summary.getRow(1).values = ['항목', '값']
  summary.getRow(1).font = { bold: true }
  summary.getColumn(1).width = 18
  summary.getColumn(2).width = 18

  const totalAmount = items.reduce((sum, item) => sum + itemTotal(item), 0)
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
  const profitTotal = items.filter((item) => item.salePrice).reduce((sum, item) => sum + itemProfit(item), 0)
  const creditTotal = items.filter(isUnpaidCredit).reduce((sum, item) => sum + itemTotal(item), 0)

  summary.addRows([
    ['내보낸 날짜', getToday()],
    ['건수', items.length],
    ['총 수량', totalQty],
    ['총 금액', totalAmount],
    ['별표', items.filter((item) => item.starred).length],
    ['안 갚은 외상', creditTotal],
    ['남는 돈(판매가 적은 것)', profitTotal],
  ])
  summary.getCell('B5').numFmt = '#,##0'
  summary.getCell('B7').numFmt = '#,##0'
  summary.getCell('B8').numFmt = '#,##0'

  if (entries) {
    const ledger = summarizeLedger(items, entries)
    summary.addRow([])
    summary.addRow(['가계부', '']).font = { bold: true }
    for (const [label, amount] of [
      ['들어온 돈', ledger.income],
      ['나간 돈', ledger.expense],
      ['  사입', ledger.purchase],
      ['  그 밖에', ledger.otherExpense],
      ['남은 돈', ledger.balance],
    ]) {
      summary.addRow([label, amount]).getCell(2).numFmt = '#,##0'
    }
  }

  const shopMap = new Map()
  for (const item of items) {
    const name = item.shop?.name ?? '미지정'
    shopMap.set(name, (shopMap.get(name) || 0) + itemTotal(item))
  }

  summary.addRow([])
  const titleRow = summary.addRow(['가게별 합계', ''])
  titleRow.font = { bold: true }
  for (const [name, amount] of [...shopMap.entries()].sort((a, b) => b[1] - a[1])) {
    const r = summary.addRow([name, amount])
    r.getCell(2).numFmt = '#,##0'
  }

  // 가게 정보(전화·메모·숨김)도 따로 담아, 이 엑셀을 다시 넣을 때 그대로 되살림
  const shopSheet = workbook.addWorksheet('가게')
  shopSheet.addRow(['가게', '상가위치', '전화', '메모', '숨김'])
  shopSheet.getRow(1).font = { bold: true }
  shopSheet.columns = [{ width: 14 }, { width: 22 }, { width: 16 }, { width: 28 }, { width: 6 }]
  const seenShops = new Set()
  for (const item of items) {
    const shop = item.shop
    if (!shop || seenShops.has(shop.id)) continue
    seenShops.add(shop.id)
    shopSheet.addRow([
      shop.name,
      shopLocation(shop),
      shop.phone || '',
      shop.memo || '',
      shop.hidden ? 'O' : '',
    ])
  }

  // 가계부: 사입 말고 다른 지출·수입 (다시 넣을 때 그대로 되살림)
  if (entries) {
    const ledgerSheet = workbook.addWorksheet('가계부', { views: [{ state: 'frozen', ySplit: 1 }] })
    ledgerSheet.addRow(['날짜', '구분', '분류', '금액', '결제', '메모'])
    ledgerSheet.getRow(1).font = { bold: true }
    ledgerSheet.columns = [
      { width: 12 },
      { width: 8 },
      { width: 14 },
      { width: 12 },
      { width: 9 },
      { width: 24 },
    ]
    const sorted = [...entries].sort(
      (a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0),
    )
    for (const entry of sorted) {
      const row = ledgerSheet.addRow([
        entry.date,
        entry.type === 'income' ? '수입' : '지출',
        entry.category || '기타',
        Number(entry.amount) || 0,
        entry.payment || '',
        entry.memo || '',
      ])
      row.getCell(4).numFmt = '#,##0'
    }
  }

  if (entries) addMonthlySheet(workbook, items, entries)

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(buffer, `사입장부_${fileLabel ? `${fileLabel}_` : ''}${getToday()}.xlsx`)
}

/** 「월별 결산」 시트: 달마다 들어온 돈·나간 돈·남은 돈과 분류별 나간 돈 (보기용, 다시 넣을 때는 읽지 않음) */
function addMonthlySheet(workbook, items, entries) {
  const keys = [
    ...new Set([
      ...items.map((item) => monthKeyOf(ledgerDate(item))),
      ...entries.map((entry) => monthKeyOf(entry.date)),
    ]),
  ]
    .filter(Boolean)
    .sort()
  if (keys.length === 0) return
  const months = ledgerByMonth(items, entries, keys)
  const sheet = workbook.addWorksheet('월별 결산', { views: [{ state: 'frozen', ySplit: 1 }] })
  const money = '#,##0'
  const bold = { bold: true }

  sheet.addRow(['달', '들어온 돈', '사입', '그 밖에 나간 돈', '나간 돈 합계', '남은 돈']).font = bold
  sheet.columns = [{ width: 10 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 14 }]
  const sum = { income: 0, purchase: 0, otherExpense: 0, expense: 0, balance: 0 }
  for (const key of keys) {
    const m = months[key]
    const [y, mm] = key.split('-')
    sheet.addRow([`${y}년 ${Number(mm)}월`, m.income, m.purchase, m.otherExpense, m.expense, m.balance])
    for (const field of Object.keys(sum)) sum[field] += m[field]
  }
  const total = sheet.addRow(['합계', sum.income, sum.purchase, sum.otherExpense, sum.expense, sum.balance])
  total.font = bold
  if (keys.length > 1) {
    sheet.addRow([
      '한 달 평균',
      ...['income', 'purchase', 'otherExpense', 'expense', 'balance'].map((field) =>
        Math.round(sum[field] / keys.length),
      ),
    ])
  }

  // 분류별 나간 돈: 분류 × 달
  sheet.addRow([])
  sheet.addRow(['분류별 나간 돈']).font = bold
  const all = summarizeLedger(
    items.filter((item) => keys.includes(monthKeyOf(ledgerDate(item)))),
    entries,
  )
  const header = sheet.addRow(['분류', '합계', '비율', ...keys.map((key) => `${Number(key.slice(5))}월`)])
  header.font = bold
  for (const row of all.byCategory) {
    sheet
      .addRow([
        row.name,
        row.amount,
        all.expense ? row.amount / all.expense : 0,
        ...keys.map((key) => months[key].byCategory.find((c) => c.name === row.name)?.amount ?? 0),
      ])
      .getCell(3).numFmt = '0%'
  }
  for (let col = 4; col <= 3 + keys.length; col++)
    sheet.getColumn(col).width = Math.max(sheet.getColumn(col).width ?? 0, 10)

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (typeof cell.value === 'number' && cell.numFmt !== '0%') cell.numFmt = money
    })
  })
}
