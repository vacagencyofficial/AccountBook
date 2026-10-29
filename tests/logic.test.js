import { describe, it, expect } from 'vitest'
import { summarizeItems, groupByShop } from '../src/utils/analytics.js'
import { filterHistoryItems } from '../src/hooks/useHistoryFilters.js'

const items = [
  { shopId: 1, date: '2026-10-28', price: 10000, qty: 1, status: '구매', name: 'a' },
  { shopId: 1, date: '2026-10-28', price: 20000, qty: 1, status: '검토', name: 'b' },
  { shopId: 2, date: '2026-10-27', price: 30000, qty: 1, status: '보류', name: 'c' },
  { shopId: 2, date: '2026-10-01', price: 5000, qty: 2, name: 'old (상태 없음=구매)' },
]
describe('D01 합계', () => {
  it('구매 1만/검토 2만/보류 3만 → 합계 1만, 후보 2건 5만', () => {
    const s = summarizeItems(items.slice(0, 3))
    expect(s).toEqual({ count: 1, total: 10000, qty: 1, pendingCount: 2, pendingTotal: 50000 })
  })
  it('상태 없는 옛 기록은 구매로 계산', () => {
    expect(summarizeItems([items[3]]).total).toBe(10000)
  })
  it('가게별 합계도 구매만', () => {
    const g = groupByShop(items)
    expect(g.find((r) => r.shopId === 1).total).toBe(10000)
    expect(g.find((r) => r.shopId === 2).total).toBe(10000)
  })
})
describe('D08 날짜 필터', () => {
  const base = { period: 'custom', customStart: '', customEnd: '', shopId: 'all', status: 'all', category: 'all', query: '' }
  it('날짜가 비어도 가게 조건은 적용', () => {
    const r = filterHistoryItems(items, { ...base, shopId: '2' }, { start: '', end: '' })
    expect(r.map((i) => i.name)).toEqual(['c', 'old (상태 없음=구매)'])
  })
  it('날짜가 비어도 검색 조건은 적용', () => {
    expect(filterHistoryItems(items, { ...base, query: 'b' }, { start: '', end: '' }).length).toBe(1)
  })
  it('거꾸로 고른 날짜도 기간으로 인식', () => {
    const r = filterHistoryItems(items, base, { start: '2026-10-28', end: '2026-10-27' })
    expect(r.length).toBe(3)
  })
})
