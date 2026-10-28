import { useMemo, useState } from 'react'
import { getPeriodRange } from '../utils/dateRange'

export const PERIOD_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'thisMonth', label: '이번 달' },
  { value: 'lastMonth', label: '지난 달' },
  { value: 'custom', label: '직접 선택' },
]

export const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: '구매', label: '구매' },
  { value: '검토', label: '검토' },
  { value: '보류', label: '보류' },
]

export const CATEGORY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: '상의', label: '상의' },
  { value: '하의', label: '하의' },
  { value: '아우터', label: '아우터' },
  { value: '원피스', label: '원피스' },
  { value: '잡화', label: '잡화' },
  { value: '기타', label: '기타' },
]

const defaultFilters = {
  period: 'thisMonth',
  customStart: '',
  customEnd: '',
  shopId: 'all',
  status: 'all',
  category: 'all',
  query: '',
}

export function useHistoryFilters() {
  const [filters, setFilters] = useState(defaultFilters)

  const dateRange = useMemo(
    () => getPeriodRange(filters.period, filters.customStart, filters.customEnd),
    [filters.period, filters.customStart, filters.customEnd],
  )

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setFilters(defaultFilters)
  }

  const hasActiveFilters =
    filters.period !== 'thisMonth' ||
    filters.shopId !== 'all' ||
    filters.status !== 'all' ||
    filters.category !== 'all' ||
    Boolean(filters.query.trim())

  return {
    filters,
    dateRange,
    updateFilter,
    resetFilters,
    hasActiveFilters,
  }
}

export function filterHistoryItems(items, filters, dateRange) {
  if (!items) return []

  const q = filters.query.trim().toLowerCase()

  return items.filter((item) => {
    if (filters.period !== 'all' && (dateRange.start || dateRange.end)) {
      let { start, end } = dateRange
      if (start && end && start > end) [start, end] = [end, start]
      const inRange = (!start || item.date >= start) && (!end || item.date <= end)
      if (!inRange) return false
    }

    if (filters.shopId !== 'all' && item.shopId !== Number(filters.shopId)) {
      return false
    }

    if (filters.status !== 'all' && item.status !== filters.status) {
      return false
    }

    if (filters.category !== 'all' && (item.category || '기타') !== filters.category) {
      return false
    }

    if (q) {
      const hay = [
        item.name,
        item.memo,
        item.color,
        item.size,
        item.shop?.name,
        item.shop?.building,
        item.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }

    return true
  })
}
