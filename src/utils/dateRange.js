export function formatDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getMonthRange(year, month) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: formatDateString(start),
    end: formatDateString(end),
  }
}

export function getThisMonthRange() {
  const now = new Date()
  return getMonthRange(now.getFullYear(), now.getMonth())
}

export function getLastMonthRange() {
  const now = new Date()
  return getMonthRange(now.getFullYear(), now.getMonth() - 1)
}

export function isDateInRange(dateStr, startStr, endStr) {
  if (!dateStr) return false
  if (startStr && dateStr < startStr) return false
  if (endStr && dateStr > endStr) return false
  return true
}

export function getPeriodRange(period, customStart, customEnd) {
  switch (period) {
    case 'thisMonth':
      return getThisMonthRange()
    case 'lastMonth':
      return getLastMonthRange()
    case 'custom':
      return { start: customStart || '', end: customEnd || '' }
    default:
      return { start: '', end: '' }
  }
}
