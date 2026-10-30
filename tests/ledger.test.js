import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  compareByCategory,
  ledgerByMonth,
  previousMonthKey,
  recentMonthKeys,
  summarizeLedger,
} from '../src/utils/ledger.js'

const store = {}
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => {
    store[k] = String(v)
  },
  removeItem: (k) => delete store[k],
}

const { db } = await import('../src/db/index.js')
const { addRecurringRule, applyRecurringRules, getRecurringRules } = await import('../src/lib/recurring.js')

const item = (date, price, qty = 1, status = '구매') => ({ date, price, qty, status })
const entry = (type, date, amount, category) => ({ type, date, amount, category })

describe('가계부 결산', () => {
  it('나간 돈 = 산 상품(사입) + 그 밖의 지출, 남은 돈 = 들어온 돈 − 나간 돈', () => {
    const s = summarizeLedger(
      [item('2026-10-01', 10000, 2), item('2026-10-01', 5000, 1, '검토')],
      [entry('expense', '2026-10-01', 3000, '식비'), entry('income', '2026-10-02', 50000, '판매')],
    )
    expect(s).toMatchObject({
      purchase: 20000,
      otherExpense: 3000,
      expense: 23000,
      income: 50000,
      balance: 27000,
    })
    expect(s.byCategory).toEqual([
      { name: '사입', amount: 20000 },
      { name: '식비', amount: 3000 },
    ])
  })

  it('달마다 나눠 결산하고 지난달과 분류별로 비교', () => {
    const months = ledgerByMonth(
      [item('2026-09-03', 10000), item('2026-10-03', 30000)],
      [entry('expense', '2026-09-05', 8000, '식비'), entry('expense', '2026-10-05', 2000, '식비')],
      ['2026-09', '2026-10'],
    )
    expect(months['2026-09'].expense).toBe(18000)
    expect(months['2026-10'].expense).toBe(32000)
    const rows = compareByCategory(months['2026-10'], months['2026-09'])
    expect(rows[0]).toEqual({ name: '사입', now: 30000, before: 10000, diff: 20000, rate: 200 })
    expect(rows[1]).toEqual({ name: '식비', now: 2000, before: 8000, diff: -6000, rate: -75 })
  })

  it('달 키: 해가 바뀌어도 맞음', () => {
    expect(previousMonthKey('2026-01')).toBe('2025-12')
    expect(recentMonthKeys(3, new Date(2026, 0, 15))).toEqual(['2025-11', '2025-12', '2026-01'])
  })
})

describe('매달 나가는 돈', () => {
  beforeEach(async () => {
    await db.entries.clear()
    localStorage.removeItem('sailp-recurring')
  })

  it('정한 날이 지나면 그달 기록을 한 번만 적음', async () => {
    addRecurringRule({ type: 'expense', amount: 300000, category: '가게 운영', memo: '월세', day: 5 })
    const today = new Date()
    const created = await applyRecurringRules(today)
    expect(created).toBe(today.getDate() >= 5 ? 1 : 0)
    expect(await applyRecurringRules(today)).toBe(0)
    expect(await db.entries.count()).toBe(created)
  })

  it('오래 안 켰으면 밀린 달을 모두 적음 (최대 12달)', async () => {
    addRecurringRule({ type: 'income', amount: 1000000, category: '기타 수입', memo: '월급', day: 1 })
    const rules = getRecurringRules()
    rules[0].lastMonth = '2026-06'
    localStorage.setItem('sailp-recurring', JSON.stringify(rules))
    expect(await applyRecurringRules(new Date(2026, 9, 2))).toBe(4)
    const dates = (await db.entries.toArray()).map((e) => e.date).sort()
    expect(dates).toEqual(['2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'])
    expect((await db.entries.toArray()).every((e) => e.type === 'income' && e.memo === '월급 (매달)')).toBe(
      true,
    )
  })
})
