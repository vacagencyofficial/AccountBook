import { db } from '../db'
import { createEntry } from '../db/mutations'

/**
 * 매달·매주 나가는 돈·들어오는 돈(월세·통신비·월급 등).
 * 규칙은 이 폰에 저장하고, 정한 날이 되면 그 회차 기록을 한 번 자동으로 적음.
 * 같은 날 같은 기록이 이미 있으면(다른 폰이 먼저 적은 것 등) 다시 적지 않음.
 */
const KEY = 'sailp-recurring'
// 오래 앱을 안 켰을 때 한 번에 채우는 최대 회차
const MAX_MONTHS = 12
const MAX_WEEKS = 26

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

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

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function ymd(date) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`
}

function parseYmd(text) {
  const [y, m, d] = text.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 「매달 5일」 「매주 월요일」 */
export function describeRule(rule) {
  return rule.every === 'week' ? `매주 ${WEEKDAYS[rule.weekday]}요일` : `매달 ${rule.day}일`
}

/**
 * 규칙 더하기.
 * startDate를 주면(가계부 적기에서 「반복」) 그날 기록은 이미 적었으므로 그다음 회차부터,
 * 없으면(설정) 이번 회차부터 적음
 */
export function addRecurringRule(rule, startDate = null) {
  const every = rule.every === 'week' ? 'week' : 'month'
  const base = startDate ? parseYmd(startDate) : null
  const today = new Date()
  const next = {
    id: Date.now(),
    every,
    type: rule.type === 'income' ? 'income' : 'expense',
    amount: Number(rule.amount) || 0,
    category: rule.category,
    memo: rule.memo?.trim() || rule.category,
    payment: rule.type === 'income' ? '' : rule.payment || '',
  }
  if (every === 'week') {
    next.weekday = base ? base.getDay() : Math.min(6, Math.max(0, Number(rule.weekday) || 0))
    if (base) {
      next.lastDate = startDate
    } else {
      // 이번 주 그 요일(지났든 안 지났든)의 한 주 전 → 이번 주 것부터
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      d.setDate(d.getDate() - ((d.getDay() - next.weekday + 7) % 7) - 7)
      next.lastDate = ymd(d)
    }
  } else {
    next.day = Math.min(28, Math.max(1, base ? base.getDate() : Number(rule.day) || 1))
    next.lastMonth = base ? monthKey(base) : monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1))
  }
  const rules = [...getRecurringRules(), next]
  saveRecurringRules(rules)
  return rules
}

export function removeRecurringRule(id) {
  const next = getRecurringRules().filter((rule) => rule.id !== id)
  saveRecurringRules(next)
  return next
}

/** 아직 안 적은 회차 날짜들 (오늘까지) */
function dueDates(rule, today) {
  const dates = []
  if (rule.every === 'week') {
    const end = ymd(today)
    const d = parseYmd(rule.lastDate || ymd(today))
    // 몇 년을 안 켰어도 끝나도록 넉넉한 상한, 적는 것은 최근 MAX_WEEKS번만
    for (let i = 0; i < 1000; i++) {
      d.setDate(d.getDate() + 7)
      const key = ymd(d)
      if (key > end) break
      dates.push(key)
    }
    return dates.slice(-MAX_WEEKS)
  }
  // 이번 달 정한 날이 아직 안 왔으면 지난달까지만
  const lastDue =
    today.getDate() >= rule.day
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth() - 1, 1)
  for (let i = 0; i < MAX_MONTHS; i++) {
    const month = monthKey(new Date(lastDue.getFullYear(), lastDue.getMonth() - i, 1))
    if (rule.lastMonth && month <= rule.lastMonth) break
    dates.unshift(`${month}-${String(rule.day).padStart(2, '0')}`)
  }
  return dates
}

function ruleMemo(rule) {
  return `${rule.memo} (${rule.every === 'week' ? '매주' : '매달'})`
}

/** 같은 날 같은 기록이 이미 있으면 (다른 폰에서 먼저 적었거나 규칙을 두 폰에서 정한 경우) */
async function alreadyWritten(rule, date) {
  const memo = ruleMemo(rule)
  const found = await db.entries
    .where('date')
    .equals(date)
    .filter((entry) => entry.type === rule.type && entry.amount === rule.amount && entry.memo === memo)
    .first()
  return Boolean(found)
}

// 같은 폰에서 겹쳐 불려도 한 번만 돌게
let running = null

/** 정한 날이 지난 회차 중 아직 안 적은 것을 적음. 앱을 켤 때 부름. 적은 건수를 돌려줌 */
export function applyRecurringRules(today = new Date()) {
  running ??= runRules(today).finally(() => {
    running = null
  })
  return running
}

async function runRules(today) {
  const rules = getRecurringRules()
  if (!rules.length || !db.entries) return 0
  let created = 0
  let changed = false
  for (const rule of rules) {
    rule.every ??= 'month'
    const dates = dueDates(rule, today)
    if (!dates.length) continue
    for (const date of dates) {
      if (await alreadyWritten(rule, date)) continue
      await createEntry({
        type: rule.type,
        date,
        amount: rule.amount,
        category: rule.category,
        memo: ruleMemo(rule),
        payment: rule.payment || '',
      })
      created += 1
    }
    if (rule.every === 'week') rule.lastDate = dates[dates.length - 1]
    else rule.lastMonth = dates[dates.length - 1].slice(0, 7)
    changed = true
  }
  if (changed) saveRecurringRules(rules)
  return created
}
