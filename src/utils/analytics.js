import { itemTotal, getMonthPrefix, getToday } from './format'

/** 「구매」만 실제로 쓴 돈. 검토·보류는 후보라 합계에서 뺌 */
export function isPurchased(item) {
  return (item.status || '구매') === '구매'
}

/** 아직 안 갚은 외상인지 (산 것만) */
export function isUnpaidCredit(item) {
  return item.payment === '외상' && !item.settled && isPurchased(item)
}

/** 안 갚은 외상 합계·건수 */
export function summarizeCredit(items = []) {
  const unpaid = items.filter(isUnpaidCredit)
  return {
    count: unpaid.length,
    total: unpaid.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0),
    items: unpaid,
  }
}

export function summarizeItems(items = []) {
  const bought = items.filter(isPurchased)
  const pending = items.filter((item) => !isPurchased(item))
  const count = bought.length
  const total = bought.reduce((sum, item) => sum + itemTotal(item), 0)
  const qty = bought.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
  const pendingCount = pending.length
  const pendingTotal = pending.reduce((sum, item) => sum + itemTotal(item), 0)
  return { count, total, qty, pendingCount, pendingTotal }
}

export function itemsForToday(items = [], today = getToday()) {
  return items.filter((item) => item.date === today)
}

export function itemsForMonth(items = [], monthPrefix = getMonthPrefix()) {
  return items.filter((item) => item.date?.startsWith(monthPrefix))
}

export function groupByShop(items = []) {
  const map = new Map()
  for (const item of items.filter(isPurchased)) {
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
  for (const item of items.filter(isPurchased)) {
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
