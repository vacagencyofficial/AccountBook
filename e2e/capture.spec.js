import { expect, openHome, readStore, test } from './helpers'

test('상품 입력: 가게 → 가격 → 이름 순서로 적고 홈에 보임', async ({ page }) => {
  await openHome(page)
  await page.getByRole('link', { name: '상품 입력' }).first().click()
  await expect(page.getByRole('heading', { name: '어느 가게예요?' })).toBeVisible()

  await page
    .getByRole('button', { name: /핑크걸/ })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: '얼마예요?' })).toBeVisible()
  await page.getByPlaceholder('0').first().fill('23000')
  await page.getByRole('button', { name: '하나 더하기' }).click()
  await page.getByRole('button', { name: '다음' }).click()

  await expect(page.getByRole('heading', { name: '무엇을 샀어요?' })).toBeVisible()
  await page.getByPlaceholder(/예: 니트/).fill('꽈배기 가디건')
  await page.getByRole('button', { name: '46,000원 저장하기' }).click()

  await expect(page.getByText('46,000원을 저장했어요')).toBeVisible()
  const saved = (await readStore(page, 'items')).find((item) => item.name === '꽈배기 가디건')
  expect(saved).toMatchObject({ price: 23000, qty: 2, status: '구매' })

  // 다음 상품은 같은 가게로 가격부터
  await page.getByRole('button', { name: '다음 상품 입력' }).click()
  await expect(page.getByRole('heading', { name: '얼마예요?' })).toBeVisible()

  await page.goto('/')
  await expect(page.getByText('꽈배기 가디건')).toBeVisible()
})
