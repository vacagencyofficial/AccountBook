import { isPurchased } from './analytics'
import { itemTotal } from './format'

/** 사입(상품)을 가계부에서 한 분류로 보일 때 이름 */
export const PURCHASE_CATEGORY = '사입'

export function monthKeyOf(date) {
  return (date || '').slice(0, 7)
}

/** 오늘 기준 최근 n달 키 ['2026-05', …, '2026-10'] (오래된 달부터) */
export function recentMonthKeys(n, today = new Date()) {
  const keys = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

export function previousMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 한 묶음(하루·한 달 등)의 결산.
 * 나간 돈 = 사입(「샀어요」 상품) + 그 밖의 지출, 남은 돈 = 들어온 돈 − 나간 돈
 */
export function summarizeLedger(items = [], entries = []) {
  const purchase = items.filter(isPurchased).reduce((sum, item) => sum + itemTotal(item), 0)
  let otherExpense = 0
  let income = 0
  const byCategory = {}
  if (purchase) byCategory[PURCHASE_CATEGORY] = purchase
  for (const entry of entries) {
    const amount = Number(entry.amount) || 0
    if (entry.type === 'income') {
      income += amount
    } else {
      otherExpense += amount
      byCategory[entry.category || '기타'] = (byCategory[entry.category || '기타'] ?? 0) + amount
    }
  }
  const expense = purchase + otherExpense
  return {
    purchase,
    otherExpense,
    expense,
    income,
    balance: income - expense,
    byCategory: Object.entries(byCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
  }
}

/** 달마다 결산: { '2026-10': summary, … } */
export function ledgerByMonth(items = [], entries = [], keys) {
  const groups = Object.fromEntries(keys.map((key) => [key, { items: [], entries: [] }]))
  for (const item of items) groups[monthKeyOf(item.date)]?.items.push(item)
  for (const entry of entries) groups[monthKeyOf(entry.date)]?.entries.push(entry)
  return Object.fromEntries(keys.map((key) => [key, summarizeLedger(groups[key].items, groups[key].entries)]))
}

/** 두 달 분류별 비교: [{ name, now, before, diff, rate }] (변화가 큰 순) */
export function compareByCategory(now, before) {
  const names = new Set([...now.byCategory, ...before.byCategory].map((row) => row.name))
  const pick = (summary, name) => summary.byCategory.find((row) => row.name === name)?.amount ?? 0
  return [...names]
    .map((name) => {
      const a = pick(now, name)
      const b = pick(before, name)
      return { name, now: a, before: b, diff: a - b, rate: b ? Math.round(((a - b) / b) * 100) : null }
    })
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))
}
