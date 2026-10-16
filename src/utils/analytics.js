import { itemTotal, getMonthPrefix, getToday } from './format'

export function summarizeItems(items = []) {
  const count = items.length
  const total = items.reduce((sum, item) => sum + itemTotal(item), 0)
  const qty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
  return { count, total, qty }
}

export function itemsForToday(items = [], today = getToday()) {
  return items.filter((item) => item.date === today)
}

export function itemsForMonth(items = [], monthPrefix = getMonthPrefix()) {
  return items.filter((item) => item.date?.startsWith(monthPrefix))
}

export function groupByShop(items = []) {
  const map = new Map()
  for (const item of items) {
    const key = item.shopId
    const prev = map.get(key) || {
      shopId: key,
      shop: item.shop,
      count: 0,
      total: 0,
      qty: 0,
    }
    prev.count += 1
    prev.total += itemTotal(item)
    prev.qty += Number(item.qty) || 0
    map.set(key, prev)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function groupByCategory(items = []) {
  const map = new Map()
  for (const item of items) {
    const key = item.category || '기타'
    const prev = map.get(key) || { category: key, count: 0, total: 0 }
    prev.count += 1
    prev.total += itemTotal(item)
    map.set(key, prev)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function groupByStatus(items = []) {
  const map = new Map()
  for (const item of items) {
    const key = item.status || '구매'
    const prev = map.get(key) || { status: key, count: 0, total: 0 }
    prev.count += 1
    prev.total += itemTotal(item)
    map.set(key, prev)
  }
  return [...map.values()]
}
