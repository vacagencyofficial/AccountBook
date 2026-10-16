import ExcelJS from 'exceljs'
import { getToday, itemTotal, shopLocation } from './format'

function downloadBlob(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportHistoryToExcel(items, { includePhotos = false } = {}) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '사입노트'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('사입장부', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  const headers = [
    '날짜',
    '가게',
    '상가위치',
    '품명',
    '카테고리',
    '색상',
    '사이즈',
    '단가',
    '수량',
    '합계',
    '상태',
    '메모',
  ]
  if (includePhotos) headers.push('사진')

  sheet.addRow(headers)
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F6E6A' },
  }
  header.alignment = { vertical: 'middle', horizontal: 'center' }
  header.height = 22

  sheet.columns = [
    { width: 12 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 10 },
    { width: 10 },
    { width: 8 },
    { width: 12 },
    { width: 8 },
    { width: 12 },
    { width: 8 },
    { width: 24 },
    ...(includePhotos ? [{ width: 14 }] : []),
  ]

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const rowNumber = i + 2
    const row = sheet.getRow(rowNumber)
    row.values = [
      undefined,
      item.date,
      item.shop?.name ?? '',
      shopLocation(item.shop),
      item.name,
      item.category || '기타',
      item.color || '',
      item.size || '',
      Number(item.price) || 0,
      Number(item.qty) || 0,
      itemTotal(item),
      item.status || '구매',
      item.memo || '',
    ]
    row.alignment = { vertical: 'middle' }
    row.getCell(8).numFmt = '#,##0'
    row.getCell(9).numFmt = '#,##0'
    row.getCell(10).numFmt = '#,##0'

    if (includePhotos && item.photo?.blob) {
      try {
        row.height = 70
        const buffer = await item.photo.blob.arrayBuffer()
        const imageId = workbook.addImage({
          buffer,
          extension: 'jpeg',
        })
        sheet.addImage(imageId, {
          tl: { col: 12, row: rowNumber - 1 },
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

  summary.addRows([
    ['내보낸 날짜', getToday()],
    ['건수', items.length],
    ['총 수량', totalQty],
    ['총 금액', totalAmount],
  ])
  summary.getCell('B5').numFmt = '#,##0'

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

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(buffer, `사입장부_${getToday()}.xlsx`)
}
