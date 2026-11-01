import path from 'node:path'
import { expect, openHome, readStore, test } from './helpers'

const KNIT = path.join(import.meta.dirname, 'fixtures', 'knit.jpg')

async function pickPhoto(page, buttonName) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: buttonName }).click(),
  ])
  await chooser.setFiles(KNIT)
}

test('여러 개 한 번에 적기: 가게 화면에서 시작, 줄마다 사진·색·크기·판매가', async ({ page }) => {
  await openHome(page)
  const before = await readStore(page, 'items')
  await page.goto('/shops')
  await page
    .getByRole('link', { name: /루나샵/ })
    .first()
    .click()
  await page.getByRole('button', { name: '이 가게에서 여러 개 한 번에 적기' }).click()

  await expect(page.getByRole('heading', { name: '여러 개 한 번에 적기' })).toBeVisible()
  await expect(page.getByRole('button', { name: /루나샵/ }).first()).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('textbox', { name: '1번 상품 이름' }).fill('린넨 셔츠')
  await page.getByRole('textbox', { name: '1번 상품 한 개 가격' }).fill('18000')
  await page.getByRole('button', { name: '1번 상품 하나 더하기' }).click()
  await page.getByRole('button', { name: /1번 상품 더 적기/ }).click()
  await page.getByRole('textbox', { name: '1번 상품 색' }).fill('아이보리')
  await page.getByRole('textbox', { name: '1번 상품 크기' }).fill('FREE')
  await page.getByRole('textbox', { name: '1번 상품 판매가' }).fill('29000')
  await expect(page.getByText('한 개에 11,000원 남아요')).toBeVisible()
  await pickPhoto(page, '1번 상품 사진 고르기')
  await expect(page.getByRole('list', { name: '1번 상품 사진' }).locator('li')).toHaveCount(1)

  await page.getByRole('textbox', { name: '2번 상품 이름' }).fill('와이드 팬츠')
  // 가격이 빠지면 저장하지 않고 알려 줌
  await page.getByRole('button', { name: /저장하기/ }).click()
  await expect(page.getByText('이름이나 가격이 빠진 줄이 1개 있어요')).toBeVisible()
  await page.getByRole('textbox', { name: '2번 상품 한 개 가격' }).fill('21000')

  await page.getByRole('button', { name: '2가지 · 57,000원 저장하기' }).click()
  await expect(page.getByText('57,000원을 저장했어요')).toBeVisible()
  await expect(page.getByText(/사진 1장/)).toBeVisible()

  const added = (await readStore(page, 'items')).filter((item) => !before.some((old) => old.id === item.id))
  expect(added).toHaveLength(2)
  const shirt = added.find((item) => item.name === '린넨 셔츠')
  expect(shirt).toMatchObject({ qty: 2, color: '아이보리', size: 'FREE', salePrice: 29000 })
  expect(added.every((item) => item.shopId === shirt.shopId)).toBe(true)
  const photos = (await readStore(page, 'photos')).filter((photo) => photo.itemId === shirt.id)
  expect(photos).toHaveLength(1)
  expect(photos[0].blob.type).toBe('image/jpeg')
})
