import { describe, it, expect, beforeEach } from 'vitest'
import {
  isUnpaidCredit,
  itemProfit,
  profitRate,
  summarizeCredit,
  summarizeItems,
  summarizeProfit,
} from '../src/utils/analytics.js'
import { formatManwon, formatWonShort } from '../src/utils/labels.js'

// 브라우저 저장소 흉내
const store = {}
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => {
    store[k] = String(v)
  },
  removeItem: (k) => delete store[k],
}
const { backupReminder, markBackupDone, snoozeBackupReminder } = await import('../src/lib/backupStatus.js')
const { getMonthBudget, setMonthBudget } = await import('../src/lib/budget.js')

const DAY = 86400000

describe('외상', () => {
  const items = [
    { price: 10000, qty: 2, status: '구매', payment: '외상' },
    { price: 5000, qty: 1, status: '구매', payment: '외상', settled: 1 },
    { price: 7000, qty: 1, status: '검토', payment: '외상' },
    { price: 3000, qty: 3, status: '구매', payment: '카드' },
  ]
  it('안 갚은 외상은 「샀어요」이면서 갚지 않은 것만', () => {
    expect(items.map(isUnpaidCredit)).toEqual([true, false, false, false])
    expect(summarizeCredit(items)).toMatchObject({ count: 1, total: 20000 })
  })
  it('쓴 돈 합계는 결제 방법과 상관없이 「샀어요」만', () => {
    expect(summarizeItems(items).total).toBe(20000 + 5000 + 9000)
  })
})

describe('판매가·남는 돈', () => {
  it('(판매가 − 사 온 값) × 수량, 비율은 판매가 기준', () => {
    const item = { price: 15000, qty: 5, salePrice: 25000, status: '구매' }
    expect(itemProfit(item)).toBe(50000)
    expect(profitRate(item)).toBe(40)
    expect(itemProfit({ price: 20000, qty: 2, salePrice: 15000 })).toBe(-10000)
    expect(profitRate({ price: 1000, qty: 1 })).toBeNull()
  })
  it('남는 돈 합계는 판매가를 적은 「샀어요」만', () => {
    const items = [
      { price: 15000, qty: 5, salePrice: 25000, status: '구매' },
      { price: 10000, qty: 1, salePrice: 20000, status: '검토' },
      { price: 9000, qty: 1, status: '구매' },
    ]
    expect(summarizeProfit(items)).toEqual({ count: 1, total: 50000 })
  })
})

describe('금액 짧게', () => {
  it('만·천 단위, 원 붙이기', () => {
    expect(formatManwon(45000)).toBe('4.5만')
    expect(formatManwon(170000)).toBe('17만')
    expect(formatWonShort(3000000)).toBe('300만원')
    expect(formatWonShort(500)).toBe('500원')
  })
})

describe('백업 알림', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
  })
  const now = Date.now()
  it('같이 쓰기를 쓰면 알리지 않음', () => {
    expect(backupReminder({ oldestItemAt: now - 10 * DAY, cloudConnected: true, now })).toBeNull()
  })
  it('기록이 3일 넘었는데 백업이 없으면 알림, 3일 전엔 조용히', () => {
    expect(backupReminder({ oldestItemAt: now - 4 * DAY, cloudConnected: false, now })).toEqual({
      neverBackedUp: true,
    })
    expect(backupReminder({ oldestItemAt: now - 1 * DAY, cloudConnected: false, now })).toBeNull()
  })
  it('백업 30일 지나면 다시, 「나중에」는 일주일', () => {
    markBackupDone()
    expect(backupReminder({ oldestItemAt: now - 100 * DAY, cloudConnected: false, now })).toBeNull()
    // 방금 백업한 시각이 now와 몇 ms 달라 30~31일로 셈
    expect(
      backupReminder({ oldestItemAt: now - 100 * DAY, cloudConnected: false, now: now + 31 * DAY })?.days,
    ).toBeGreaterThanOrEqual(30)
    store['sailp-last-backup'] = String(now - 40 * DAY)
    expect(backupReminder({ oldestItemAt: now - 100 * DAY, cloudConnected: false, now })).toEqual({
      days: 40,
    })
    snoozeBackupReminder()
    expect(backupReminder({ oldestItemAt: now - 100 * DAY, cloudConnected: false, now })).toBeNull()
  })
})

describe('예산', () => {
  it('저장·지우기', () => {
    setMonthBudget(3000000)
    expect(getMonthBudget()).toBe(3000000)
    setMonthBudget(0)
    expect(getMonthBudget()).toBe(0)
  })
})
