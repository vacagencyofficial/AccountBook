const KEY = 'sailp-month-budget'

/** 한 달 예산(원). 없으면 0 */
export function getMonthBudget() {
  try {
    return Number(localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}

export function setMonthBudget(amount) {
  try {
    if (amount > 0) localStorage.setItem(KEY, String(Math.round(amount)))
    else localStorage.removeItem(KEY)
  } catch {
    // 저장이 막힌 브라우저면 이번에만
  }
}
