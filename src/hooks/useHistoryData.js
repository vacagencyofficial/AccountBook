import { useMemo } from 'react'
import { filterHistoryItems } from './useHistoryFilters'
import { groupByCategory, groupByShop, summarizeItems, summarizeProfit } from '../utils/analytics'
import { ledgerDate, summarizeLedger } from '../utils/ledger'

export const emptyFind = {
  shopId: 'all',
  category: 'all',
  status: 'all',
  entryCategory: 'all',
  query: '',
  allMonths: false,
}

/**
 * 장부 화면 계산: 찾기 조건·보는 달로 상품·가계부 기록을 거르고, 결산·날짜별 묶음을 만듦.
 * 화면은 이 결과를 그리기만 함
 */
export function useHistoryData({ items, entries, find, monthRange }) {
  const hasFind =
    find.shopId !== 'all' ||
    find.category !== 'all' ||
    find.status !== 'all' ||
    find.entryCategory !== 'all' ||
    Boolean(find.query.trim())
  // 가계부 분류로 찾을 때는 상품은 빼고 그 분류 가계부 기록만
  const onlyEntries = find.entryCategory !== 'all'
  const searchAll = find.allMonths && hasFind

  const filteredItems = useMemo(
    () =>
      onlyEntries
        ? []
        : filterHistoryItems(
            items,
            { ...find, period: searchAll ? 'all' : 'month' },
            searchAll ? {} : monthRange,
          ),
    [items, find, searchAll, monthRange, onlyEntries],
  )

  // 가계부(사입 말고 다른 지출·수입): 가게·종류·상태로 찾을 때는 빼고, 찾는 말은 메모·분류에서
  const filteredEntries = useMemo(() => {
    if (find.shopId !== 'all' || find.category !== 'all' || find.status !== 'all') return []
    const query = find.query.trim().toLowerCase()
    return (entries ?? []).filter(
      (entry) =>
        (searchAll || (monthRange.start <= entry.date && entry.date <= monthRange.end)) &&
        (!onlyEntries || entry.category === find.entryCategory) &&
        (!query || `${entry.memo ?? ''} ${entry.category ?? ''}`.toLowerCase().includes(query)),
    )
  }, [entries, find, searchAll, monthRange, onlyEntries])

  const summary = useMemo(() => summarizeItems(filteredItems), [filteredItems])
  // 가계부 결산용 상품: 외상을 갚은 날로 옮긴 것은 갚은 날 기준
  const ledgerItems = useMemo(() => {
    if (searchAll || onlyEntries) return filteredItems
    return filterHistoryItems(items, { ...find, period: 'all' }, {}).filter((item) => {
      const date = ledgerDate(item)
      return monthRange.start <= date && date <= monthRange.end
    })
  }, [items, find, searchAll, monthRange, filteredItems, onlyEntries])
  const ledger = useMemo(() => summarizeLedger(ledgerItems, filteredEntries), [ledgerItems, filteredEntries])
  const profit = useMemo(() => summarizeProfit(filteredItems), [filteredItems])
  const shopBreakdown = useMemo(() => groupByShop(filteredItems).slice(0, 5), [filteredItems])
  const categoryBreakdown = useMemo(() => groupByCategory(filteredItems), [filteredItems])

  const byDate = useMemo(() => {
    const map = {}
    for (const item of filteredItems) (map[item.date] ??= []).push(item)
    return map
  }, [filteredItems])
  const ledgerByDate = useMemo(() => {
    const map = {}
    for (const item of ledgerItems) (map[ledgerDate(item)] ??= []).push(item)
    return map
  }, [ledgerItems])
  const entriesByDate = useMemo(() => {
    const map = {}
    for (const entry of filteredEntries) (map[entry.date] ??= []).push(entry)
    return map
  }, [filteredEntries])
  // 그날 산 상품 + 다른 날 산 외상을 그날 갚은 것
  const rowsOf = (date) => [
    ...(byDate[date] ?? []),
    ...(ledgerByDate[date] ?? []).filter((item) => item.date !== date),
  ]

  return {
    hasFind,
    searchAll,
    filteredItems,
    filteredEntries,
    summary,
    ledger,
    profit,
    shopBreakdown,
    categoryBreakdown,
    byDate,
    ledgerByDate,
    entriesByDate,
    rowsOf,
  }
}
