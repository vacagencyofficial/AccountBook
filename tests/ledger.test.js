import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  compareByCategory,
  ledgerByMonth,
  ledgerDate,
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
const { addRecurringRule, applyRecurringRules, getRecurringRules, updateRecurringRule } = await import(
  '../src/lib/recurring.js'
)
const { categoryBudgetStatus, setCategoryBudget } = await import('../src/lib/budget.js')
const { addCustomCategory, entryCategories, removeCustomCategory } = await import(
  '../src/lib/entryCategories.js'
)

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

  it('외상을 「갚은 날 나간 돈으로」 고르면 갚은 달에 셈', () => {
    const credit = { ...item('2026-09-20', 100000), payment: '외상', settled: 1, settledDate: '2026-10-05' }
    const sameDay = { ...item('2026-09-20', 50000), payment: '외상', settled: 1, settledDate: '' }
    expect(ledgerDate(credit)).toBe('2026-10-05')
    expect(ledgerDate({ ...credit, payment: '현금' })).toBe('2026-09-20')
    const months = ledgerByMonth([credit, sameDay], [], ['2026-09', '2026-10'])
    expect(months['2026-09'].purchase).toBe(50000)
    expect(months['2026-10'].purchase).toBe(100000)
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

describe('반복 더 보기', () => {
  beforeEach(async () => {
    await db.entries.clear()
    localStorage.removeItem('sailp-recurring')
  })

  it('같은 날 같은 기록이 이미 있으면(다른 폰이 먼저 적음) 다시 적지 않음', async () => {
    addRecurringRule({ type: 'expense', amount: 55000, category: '공과금·통신', memo: '통신비', day: 1 })
    const rules = getRecurringRules()
    rules[0].lastMonth = '2026-08'
    localStorage.setItem('sailp-recurring', JSON.stringify(rules))
    await db.entries.add({
      type: 'expense',
      date: '2026-09-01',
      amount: 55000,
      category: '공과금·통신',
      memo: '통신비 (매달)',
    })
    expect(await applyRecurringRules(new Date(2026, 9, 2))).toBe(1)
    expect((await db.entries.toArray()).map((e) => e.date).sort()).toEqual(['2026-09-01', '2026-10-01'])
  })

  it('동시에 두 번 불려도 한 번만 적음', async () => {
    addRecurringRule({ type: 'expense', amount: 1000, category: '식비', memo: '우유', day: 1 })
    const [a, b] = await Promise.all([
      applyRecurringRules(new Date(2026, 9, 2)),
      applyRecurringRules(new Date(2026, 9, 2)),
    ])
    // 두 번째 부름은 첫 번째 결과를 같이 받음
    expect([a, b]).toEqual([1, 1])
    expect(await db.entries.count()).toBe(1)
  })

  it('매주: 적은 날 다음 주부터 같은 요일에', async () => {
    // 2026-10-05는 월요일. 그날 것은 이미 적었다고 보고 다음 주부터
    addRecurringRule(
      { every: 'week', type: 'expense', amount: 20000, category: '식비', memo: '장보기' },
      '2026-10-05',
    )
    expect(getRecurringRules()[0]).toMatchObject({ every: 'week', weekday: 1, lastDate: '2026-10-05' })
    expect(await applyRecurringRules(new Date(2026, 9, 21))).toBe(2)
    const rows = await db.entries.toArray()
    expect(rows.map((e) => e.date).sort()).toEqual(['2026-10-12', '2026-10-19'])
    expect(rows.every((e) => e.memo === '장보기 (매주)')).toBe(true)
    expect(await applyRecurringRules(new Date(2026, 9, 25))).toBe(0)
  })

  it('매달: 31일에 적으면 다음 달부터 28일에', async () => {
    addRecurringRule({ type: 'expense', amount: 300000, category: '가게 운영', memo: '월세' }, '2026-08-31')
    expect(getRecurringRules()[0]).toMatchObject({ every: 'month', day: 28, lastMonth: '2026-08' })
    expect(await applyRecurringRules(new Date(2026, 9, 29))).toBe(2)
    expect((await db.entries.toArray()).map((e) => e.date).sort()).toEqual(['2026-09-28', '2026-10-28'])
  })
})

describe('가계부 분류 만들기', () => {
  beforeEach(() => localStorage.removeItem('sailp-entry-categories'))

  it('만든 분류와 다른 폰 기록의 분류가 목록에 보이고, 기타는 맨 뒤', () => {
    expect(addCustomCategory('expense', ' 병원비 ')).toBe('병원비')
    expect(addCustomCategory('expense', '병원비')).toBeNull()
    expect(addCustomCategory('expense', '식비')).toBeNull()
    const list = entryCategories('expense', [
      { type: 'expense', category: '경조사' },
      { type: 'income', category: '용돈' },
    ])
    expect(list).toContain('병원비')
    expect(list).toContain('경조사')
    expect(list).not.toContain('용돈')
    expect(list[list.length - 1]).toBe('기타')
    removeCustomCategory('expense', '병원비')
    expect(entryCategories('expense')).not.toContain('병원비')
  })
})

describe('반복 고치기·분류별 예산', () => {
  beforeEach(async () => {
    await db.entries.clear()
    localStorage.removeItem('sailp-recurring')
  })

  it('금액을 고치면 다음 회차부터 새 금액, 요일을 바꿔도 같은 주에 두 번 적지 않음', async () => {
    addRecurringRule(
      { every: 'week', type: 'expense', amount: 20000, category: '식비', memo: '장보기' },
      '2026-10-05',
    )
    const [rule] = getRecurringRules()
    updateRecurringRule(rule.id, { amount: 25000, weekday: 3 })
    expect(getRecurringRules()[0]).toMatchObject({ amount: 25000, weekday: 3, lastDate: '2026-10-07' })
    expect(await applyRecurringRules(new Date(2026, 9, 15))).toBe(1)
    const [row] = await db.entries.toArray()
    expect(row).toMatchObject({ date: '2026-10-14', amount: 25000 })
  })

  it('분류별 예산: 넘은 금액과 비율', () => {
    setCategoryBudget('식비', 100000)
    setCategoryBudget('사입', 1000000)
    const rows = categoryBudgetStatus([
      { name: '식비', amount: 130000 },
      { name: '사입', amount: 500000 },
    ])
    expect(rows[0]).toMatchObject({ name: '식비', over: 30000 })
    expect(rows[1]).toMatchObject({ name: '사입', ratio: 0.5 })
    setCategoryBudget('식비', 0)
    expect(categoryBudgetStatus([]).map((row) => row.name)).toEqual(['사입'])
  })
})
