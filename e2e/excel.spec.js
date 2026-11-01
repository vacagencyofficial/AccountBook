import os from 'node:os'
import path from 'node:path'
import ExcelJS from 'exceljs'
import { expect, openHome, test } from './helpers'

test('엑셀: 이번 달 받기(가계부·월별 결산 시트 포함) → 같은 파일 더하기는 중복 없음', async ({
  page,
}, testInfo) => {
  await openHome(page)
  await page.goto('/history')
  await page.getByText('엑셀로 받기 · 백업하기').click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /10월 기록 엑셀로 받기/ }).click(),
  ])
  // 시험 이름(한글·기호)으로 만든 폴더 경로는 파일 고르기에서 깨질 수 있어 단순한 곳에 저장
  const file = path.join(os.tmpdir(), `sailp-e2e-${testInfo.workerIndex}-${Date.now()}.xlsx`)
  await download.saveAs(file)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(file)
  const names = workbook.worksheets.map((sheet) => sheet.name)
  expect(names).toEqual(expect.arrayContaining(['사입장부', '요약', '가게', '가계부', '월별 결산']))
  expect(workbook.getWorksheet('가계부').getRow(1).values.slice(1)).toEqual([
    '날짜',
    '구분',
    '분류',
    '금액',
    '결제',
    '메모',
  ])

  // 사용자처럼 「엑셀 파일 넣기」를 눌러 파일 고르기
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: '엑셀 파일 넣기' }).click(),
  ])
  await chooser.setFiles(file)
  await page.getByRole('button', { name: '지금 기록에 더하기' }).click()
  await expect(page.getByText(/기록 0건.*을 더했어요.*이미 있는 \d+건은 건너뛰었어요/)).toBeVisible()
})
