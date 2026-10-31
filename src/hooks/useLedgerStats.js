import { useMemo } from 'react'
import { ledgerByMonth, ledgerDate, monthKeyOf, summarizeLedger } from '../utils/ledger'

/**
 * 통계 계산: 보는 기간(keys)의 달마다 결산, 기간 합계,
 * 한 해(1월~보는 달)와 작년 같은 기간, 평균을 낼 달 수
 */
export function useLedgerStats({ data, keys, prevKey, lastYearKey }) {
  const baseKey = keys[keys.length - 1]
  return useMemo(() => {
    if (!data) return null
    const months = ledgerByMonth(data.items, data.entries, [...new Set([...keys, prevKey, lastYearKey])])
    const inSpan = (date) => keys.includes(monthKeyOf(date))
    const spanSummary = summarizeLedger(
      data.items.filter((item) => inSpan(ledgerDate(item))),
      data.entries.filter((entry) => inSpan(entry.date)),
    )
    // 한 해: 이 해 1월부터 보고 있는 달까지, 작년은 같은 기간
    const year = Number(baseKey.slice(0, 4))
    const upTo = baseKey.slice(5)
    const inYear = (date, y) => date?.slice(0, 4) === String(y) && date.slice(5, 7) <= upTo
    const yearOf = (y) =>
      summarizeLedger(
        data.items.filter((item) => inYear(ledgerDate(item), y)),
        data.entries.filter((entry) => inYear(entry.date, y)),
      )
    // 평균은 이 해에 기록이 처음 있는 달부터 (쓰기 시작한 해에 빈 달까지 나누지 않게)
    const firstMonth = [...data.items.map(ledgerDate), ...data.entries.map((entry) => entry.date)]
      .filter((date) => inYear(date, year))
      .sort()[0]
    const activeMonths = firstMonth ? Number(upTo) - Number(firstMonth.slice(5, 7)) + 1 : 1
    return {
      months,
      spanSummary,
      yearSummary: yearOf(year),
      lastYearSummary: yearOf(year - 1),
      activeMonths,
    }
    // keys는 보는 달·기간으로 정해짐 (마지막 달과 길이가 같으면 같은 기간)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, baseKey, keys.length])
}
