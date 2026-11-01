import { test as base, expect } from '@playwright/test'

/** 날짜가 바뀌어도 결과가 같도록 「오늘」을 고정 */
export const TODAY = '2026-10-15'

export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+09:00`))
    // 처음 안내·설치 안내·백업 알림은 점검에 방해되지 않게 끔
    await page.addInitScript(() => {
      localStorage.setItem('sailp-onboarded', '1')
      localStorage.setItem('sailp-install-dismissed', '1')
      localStorage.setItem('sailp-backup-snooze', String(9e12))
    })
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    await provide(page)
    expect(errors, '화면 오류(JS)가 없어야 해요').toEqual([])
  },
})

export { expect }

/** 예시 데이터가 들어갈 때까지 홈을 열어 둠 */
export async function openHome(page) {
  await page.goto('/')
  await expect(page.getByText('오늘 쓴 돈')).toBeVisible()
  await expect(page.getByText('오버핏 니트').first()).toBeVisible()
}

/** 폰 안의 장부(IndexedDB) 한 칸을 통째로 읽기 */
export function readStore(page, store) {
  return page.evaluate(
    (name) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('sailp')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction(name)
          const req = tx.objectStore(name).getAll()
          tx.oncomplete = () => {
            const rows = req.result.map((row) =>
              row.blob ? { ...row, blob: { size: row.blob.size, type: row.blob.type } } : row,
            )
            open.result.close()
            resolve(rows)
          }
        }
      }),
    store,
  )
}
