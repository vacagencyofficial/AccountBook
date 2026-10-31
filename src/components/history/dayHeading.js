export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** '2026-10-31' → '10월 31일 토요일' */
export function dayHeading(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${m}월 ${d}일 ${weekday}요일`
}
