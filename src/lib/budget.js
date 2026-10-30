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

const CATEGORY_KEY = 'sailp-category-budgets'

/** 분류별 한 달 예산 { 식비: 300000, 사입: 3000000 } */
export function getCategoryBudgets() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATEGORY_KEY)) || {}
    return Object.fromEntries(Object.entries(saved).filter(([, amount]) => Number(amount) > 0))
  } catch {
    return {}
  }
}

export function saveCategoryBudgets(budgets) {
  try {
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(budgets ?? {}))
  } catch {
    // 저장이 막힌 브라우저면 이번에만
  }
}

/** amount가 0이면 그 분류 예산을 없앰 */
export function setCategoryBudget(name, amount) {
  const budgets = getCategoryBudgets()
  if (amount > 0) budgets[name] = Math.round(amount)
  else delete budgets[name]
  saveCategoryBudgets(budgets)
  return budgets
}

/** 이번 달 분류별 쓴 돈과 예산: [{ name, budget, spent, ratio, over }] (많이 쓴 비율 순) */
export function categoryBudgetStatus(byCategory, budgets = getCategoryBudgets()) {
  return Object.entries(budgets)
    .map(([name, budget]) => {
      const spent = byCategory.find((row) => row.name === name)?.amount ?? 0
      return { name, budget, spent, ratio: spent / budget, over: spent - budget }
    })
    .sort((a, b) => b.ratio - a.ratio)
}
