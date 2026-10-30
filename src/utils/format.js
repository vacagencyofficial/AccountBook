export function getToday() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatCurrency(amount) {
  return `${Number(amount || 0).toLocaleString('ko-KR')}원`
}

export function formatCompactCurrency(amount) {
  const n = Number(amount || 0)
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString('ko-KR')}만`
  return `${n.toLocaleString('ko-KR')}원`
}

export function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}월 ${Number(d)}일`
}

export function formatTodayHeader() {
  const now = new Date()
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${weekdays[now.getDay()]})`
}

export function formatMonthLabel(date = new Date()) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

export function itemTotal(item) {
  return (Number(item.price) || 0) * (Number(item.qty) || 0)
}

export function shopLocation(shop) {
  if (!shop) return ''
  return [shop.building, shop.floor, shop.unit].filter(Boolean).join(' · ')
}

export function getMonthPrefix(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
