import { expect, openHome, readStore, test } from './helpers'

test('가계부: 돈 쓴 것(매달 반복) → 장부 결산 → 분류로 찾기 → 통계 → 그달 장부', async ({ page }) => {
  await openHome(page)
  await page.getByRole('link', { name: '− 돈 쓴 것' }).click()
  await expect(page.getByRole('heading', { name: '가계부 적기' })).toBeVisible()
  await page.locator('#entry-amount').fill('55000')
  await page.getByRole('button', { name: '공과금·통신' }).click()
  await page.getByPlaceholder('예: 점심, 택시비').fill('통신비')
  await page.getByRole('button', { name: '매달' }).click()
  await expect(page.getByText(/앞으로 매달 15일에 저절로 적어요/)).toBeVisible()
  await page.getByRole('button', { name: '55,000원 저장하기' }).click()
  // 저장 알림 (화면이 넘어가기 직전에는 입력 화면 안내와 같이 보일 수 있어 알림 문구만 찾음)
  await expect(page.getByText('나간 돈 55,000원을 적었어요. 매달 15일에 저절로 적어요')).toBeVisible()

  const entry = (await readStore(page, 'entries')).find((row) => row.memo === '통신비 (매달)')
  expect(entry).toMatchObject({ type: 'expense', amount: 55000, category: '공과금·통신', date: '2026-10-15' })

  await page.goto('/history')
  const hero = page.locator('.hero').first()
  await expect(hero).toContainText('10월에 나간 돈')
  await expect(hero).toContainText('들어온 돈')
  await expect(hero).toContainText('남은 돈')

  await page.getByRole('button', { name: /찾기/ }).first().click()
  await page.getByRole('button', { name: '공과금·통신', exact: true }).click()
  await page.getByRole('tab', { name: '목록' }).click()
  await expect(page.getByText('통신비 (매달)')).toBeVisible()
  await expect(page.locator('a[href^="/items/"]')).toHaveCount(0)

  await page.getByRole('link', { name: '통계' }).click()
  await expect(page.getByRole('heading', { name: '비교·통계' })).toBeVisible()
  await expect(page.getByText('어디서 늘고 줄었나요?')).toBeVisible()
  await expect(page.getByText('2026년 한 해')).toBeVisible()
  await page.getByRole('link', { name: /^2026년 9월 나간 돈/ }).click()
  await expect(page.getByText('2026년 9월')).toBeVisible()
})

test('외상 갚음: 「오늘 나간 돈으로」면 이번 달 결산에 더해짐', async ({ page }) => {
  await openHome(page)
  const credit = (await readStore(page, 'items')).find((item) => item.payment === '외상' && !item.settled)
  const expenseOf = async () =>
    Number(
      (await page.locator('.hero').first().innerText()).match(/나간 돈\s*([\d,]+)원/)[1].replace(/,/g, ''),
    )

  // 산 날을 지난달로 옮겨 두고(이번 달 결산에서 빠짐) 오늘 갚기
  await page.evaluate(
    (id) =>
      new Promise((resolve) => {
        const open = indexedDB.open('sailp')
        open.onsuccess = () => {
          const tx = open.result.transaction('items', 'readwrite')
          const store = tx.objectStore('items')
          store.get(id).onsuccess = (e) => store.put({ ...e.target.result, date: '2026-09-10' })
          tx.oncomplete = () => resolve(open.result.close())
        }
      }),
    credit.id,
  )
  await page.goto('/stats')
  const before = await expenseOf()
  const creditTotal = credit.price * credit.qty

  await page.goto(`/items/${credit.id}`)
  await page.getByRole('button', { name: '갚았어요' }).click()
  await page.getByRole('button', { name: '오늘 나간 돈으로' }).click()
  await expect(page.getByText(/갚았어요 \(/)).toBeVisible()

  await page.goto('/stats')
  expect(await expenseOf()).toBe(before + creditTotal)
})
