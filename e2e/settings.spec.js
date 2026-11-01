import { expect, openHome, test } from './helpers'

test('설정: 분류별 예산을 넘으면 홈에 알림, 반복 금액 고치기', async ({ page }) => {
  await openHome(page)
  await page.goto('/settings')
  await page.getByRole('combobox', { name: '예산 정할 분류' }).selectOption('식비')
  await page.getByRole('textbox', { name: '분류 예산 금액' }).fill('5000')
  await page.getByRole('button', { name: '정하기' }).click()
  await expect(page.getByText('식비 예산을 5,000원으로 정했어요')).toBeVisible()

  await page.getByRole('button', { name: '+ 반복해서 적을 돈 더하기' }).click()
  await page.getByPlaceholder('이름 (예: 가게 월세)').fill('월세')
  await page.getByRole('textbox', { name: '금액', exact: true }).fill('500000')
  await page.getByRole('button', { name: '가게 운영' }).click()
  await page.getByRole('button', { name: '정해 두기' }).click()
  await expect(page.getByText(/매달 1일 · 나간 돈/)).toBeVisible()
  await page.getByRole('button', { name: '월세 고치기' }).click()
  await page.getByRole('textbox', { name: '금액', exact: true }).fill('550000')
  await page.getByRole('button', { name: '고친 대로 저장' }).click()
  await expect(page.getByText('550,000원')).toBeVisible()

  await page.goto('/')
  await expect(page.getByText('이번 달 예산을 넘었어요')).toBeVisible()
})
