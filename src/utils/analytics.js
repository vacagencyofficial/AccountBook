import { itemTotal, getMonthPrefix, getToday } from './format'

/** 「구매」만 실제로 쓴 돈. 검토·보류는 후보라 합계에서 뺌 */
export function isPurchased(item) {
  return (item.status || '구매') === '구매'
}

/** 판매가를 적은 상품의 남는 돈(합계) = (판매가 − 사 온 값) × 수량 */
export function itemProfit(item) {
  if (!item.salePrice) return 0
  return ((Number(item.salePrice) || 0) - (Number(item.price) || 0)) * (Number(item.qty) || 0)
}

/** 남는 돈 비율: 판매가 중 남는 몫(%). 판매가가 없으면 null */
export function profitRate(item) {
  const sale = Number(item.salePrice) || 0
  if (!sale) return null
  return Math.round(((sale - (Number(item.price) || 0)) / sale) * 100)
}

/** 판매가를 적은 「샀어요」 상품들의 남는 돈 */
export function summarizeProfit(items = []) {
  const priced = items.filter((item) => item.salePrice && isPurchased(item))
  return { count: priced.length, total: priced.reduce((sum, item) => sum + itemProfit(item), 0) }
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
