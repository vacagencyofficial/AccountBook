import { db } from '../db'
import { createEntry } from '../db/mutations'

/**
 * 매달 나가는 돈·들어오는 돈(월세·통신비 등).
 * 규칙은 이 폰에 저장하고, 정한 날이 되면 그달 기록을 한 번 자동으로 적음.
 * (같이 쓰는 다른 폰에는 적힌 기록이 맞춰져 보이므로, 규칙은 한 폰에서만 정하면 됨)
 */
const KEY = 'sailp-recurring'

export function getRecurringRules() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

export function saveRecurringRules(rules) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rules))
  } catch {
    // 저장이 막힌 브라우저
  }
}

export function addRecurringRule(rule) {
  const rules = getRecurringRules()
  const next = [
    ...rules,
    {
      id: Date.now(),
      type: rule.type === 'income' ? 'income' : 'expense',
      amount: Number(rule.amount) || 0,
      category: rule.category,
      memo: rule.memo?.trim() || rule.category,
      day: Math.min(28, Math.max(1, Number(rule.day) || 1)),
      // 이번 달부터 적용 (지난달 것은 적지 않음)
      lastMonth: monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)),
    },
  ]
  saveRecurringRules(next)
  return next
}

export function removeRecurringRule(id) {
  const next = getRecurringRules().filter((rule) => rule.id !== id)
  saveRecurringRules(next)
  return next
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** 정한 날이 지난 달 중 아직 안 적은 것을 적음. 앱을 켤 때 부름. 적은 건수를 돌려줌 */
export async function applyRecurringRules(today = new Date()) {
  const rules = getRecurringRules()
  if (!rules.length || !db.entries) return 0
  const current = monthKey(today)
  let created = 0
  let changed = false
  for (const rule of rules) {
    // 이번 달 정한 날이 아직 안 왔으면 지난달까지만
    const dueMonth =
      today.getDate() >= rule.day ? current : monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1))
    if (rule.lastMonth && rule.lastMonth >= dueMonth) continue
    // 마지막으로 적은 달 다음부터 적을 달까지 (오래 앱을 안 켰어도 최대 12달)
    const months = []
    const [y, m] = dueMonth.split('-').map(Number)
    for (let i = 0; i < 12; i++) {
      const key = monthKey(new Date(y, m - 1 - i, 1))
      if (rule.lastMonth && key <= rule.lastMonth) break
      months.unshift(key)
    }
    for (const key of months) {
      await createEntry({
        type: rule.type,
        date: `${key}-${String(rule.day).padStart(2, '0')}`,
        amount: rule.amount,
        category: rule.category,
        memo: `${rule.memo} (매달)`,
      })
      created += 1
    }
    rule.lastMonth = dueMonth
    changed = true
  }
  if (changed) saveRecurringRules(rules)
  return created
}
