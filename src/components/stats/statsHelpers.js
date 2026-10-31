/** '2026-10' → '10월' (withYear면 '2026년 10월') */
export function monthLabel(key, withYear = false) {
  const [y, m] = key.split('-').map(Number)
  return withYear ? `${y}년 ${m}월` : `${m}월`
}

export function sameMonthLastYear(key) {
  const [y, m] = key.split('-')
  return `${Number(y) - 1}-${m}`
}
