import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../db'

/**
 * 가계부 분류: 기본 분류 + 직접 만든 분류(이 폰에 저장, 백업에 포함)
 * + 이미 적힌 기록의 분류(다른 폰에서 만든 분류도 보이게)
 */
const KEY = 'sailp-entry-categories'
const MAX_LENGTH = 10

export function getCustomCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY)) || {}
    return { expense: saved.expense ?? [], income: saved.income ?? [] }
  } catch {
    return { expense: [], income: [] }
  }
}

export function saveCustomCategories(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ expense: value?.expense ?? [], income: value?.income ?? [] }))
  } catch {
    // 저장이 막힌 브라우저
  }
}

function defaultsOf(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

/** 고를 수 있는 분류 목록. 기본 「기타」는 맨 뒤 */
export function entryCategories(type, entries = []) {
  const defaults = defaultsOf(type)
  const other = defaults[defaults.length - 1]
  const names = [...defaults.slice(0, -1), ...getCustomCategories()[type]]
  for (const entry of entries) {
    if (entry.type === type && entry.category) names.push(entry.category)
  }
  return [...new Set(names)].filter((name) => name !== other).concat(other)
}

/** 분류 만들기. 이름이 비었거나 이미 있으면 null */
export function addCustomCategory(type, rawName) {
  const name = rawName.trim().slice(0, MAX_LENGTH)
  const custom = getCustomCategories()
  if (!name || defaultsOf(type).includes(name) || custom[type].includes(name)) return null
  custom[type] = [...custom[type], name]
  saveCustomCategories(custom)
  return name
}

/** 만든 분류 지우기 (이미 적힌 기록의 분류는 그대로) */
export function removeCustomCategory(type, name) {
  const custom = getCustomCategories()
  custom[type] = custom[type].filter((item) => item !== name)
  saveCustomCategories(custom)
  return custom
}
