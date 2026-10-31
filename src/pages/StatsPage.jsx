import { useState } from 'react'
import { Link } from 'react-router-dom'
import SubPage from '../components/SubPage'
import EmptyState from '../components/EmptyState'
import StatsMonthHero from '../components/stats/StatsMonthHero'
import StatsBudget from '../components/stats/StatsBudget'
import StatsCompare from '../components/stats/StatsCompare'
import StatsYear from '../components/stats/StatsYear'
import StatsCategoryChange from '../components/stats/StatsCategoryChange'
import StatsTrend from '../components/stats/StatsTrend'
import StatsTopCategories from '../components/stats/StatsTopCategories'
import { monthLabel, sameMonthLastYear } from '../components/stats/statsHelpers'
import { db } from '../db'
import { useLedgerStats } from '../hooks/useLedgerStats'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { compareByCategory, previousMonthKey, recentMonthKeys } from '../utils/ledger'

/** 가계부 비교·통계: 달마다 들어온 돈·나간 돈, 지난달·작년과 비교, 많이 쓴 곳 */
export default function StatsPage() {
  const now = new Date()
  const [base, setBase] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [span, setSpan] = useState(6)

  const { data, isLoading } = useLiveQuery(async () => {
    const [items, entries] = await Promise.all([db.items.toArray(), db.entries.toArray()])
    return { items, entries }
  }, [])

  const baseDate = new Date(base.year, base.month, 1)
  const isCurrentMonth = base.year === now.getFullYear() && base.month === now.getMonth()
  const keys = recentMonthKeys(span, baseDate)
  const baseKey = keys[keys.length - 1]
  const prevKey = previousMonthKey(baseKey)
  const lastYearKey = sameMonthLastYear(baseKey)

  const stats = useLedgerStats({ data, keys, prevKey, lastYearKey })

  function moveMonth(diff) {
    const d = new Date(base.year, base.month + diff, 1)
    setBase({ year: d.getFullYear(), month: d.getMonth() })
  }

  if (isLoading || !stats) {
    return (
      <SubPage title="비교·통계" backTo="/history">
        <div className="skeleton h-72" />
      </SubPage>
    )
  }

  const { months, spanSummary, yearSummary, lastYearSummary, activeMonths } = stats
  const baseYear = baseKey.slice(0, 4)
  const monthsInYear = Number(baseKey.slice(5))
  const lastYearHasAny = lastYearSummary.expense + lastYearSummary.income > 0
  const thisMonth = months[baseKey]
  const lastMonth = months[prevKey]
  const lastYear = months[lastYearKey]
  const hasAny = data.items.length + data.entries.length > 0
  const compare = compareByCategory(thisMonth, lastMonth).filter((row) => row.now || row.before)
  const maxMonth = Math.max(...keys.map((key) => Math.max(months[key].expense, months[key].income)), 1)
  const lastYearHas = lastYear.expense + lastYear.income > 0

  return (
    <SubPage title="비교·통계" subtitle="들어온 돈·나간 돈을 달마다 비교해요" backTo="/history">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="btn btn-outline px-0 text-[30px] leading-none"
          style={{ width: '3.5rem' }}
          aria-label="지난달"
        >
          ‹
        </button>
        <p className="text-[22px] font-extrabold">{monthLabel(baseKey, true)}</p>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          disabled={isCurrentMonth}
          className="btn btn-outline px-0 text-[30px] leading-none disabled:opacity-30"
          style={{ width: '3.5rem' }}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      {!hasAny ? (
        <EmptyState
          title="아직 기록이 없어요"
          description="상품 입력이나 「돈 쓴 것·돈 들어온 것」을 적으면 여기서 달마다 비교해 볼 수 있어요."
        />
      ) : (
        <div className="space-y-4">
          <StatsMonthHero thisMonth={thisMonth} baseKey={baseKey} />

          <StatsBudget thisMonth={thisMonth} baseKey={baseKey} />

          <StatsCompare
            thisMonth={thisMonth}
            lastMonth={lastMonth}
            lastYear={lastYear}
            lastYearKey={lastYearKey}
            prevKey={prevKey}
            lastYearHas={lastYearHas}
          />

          <StatsYear
            yearSummary={yearSummary}
            lastYearSummary={lastYearSummary}
            lastYearHasAny={lastYearHasAny}
            baseYear={baseYear}
            monthsInYear={monthsInYear}
            activeMonths={activeMonths}
          />

          <StatsCategoryChange prevKey={prevKey} baseKey={baseKey} compare={compare} />

          <StatsTrend
            baseKey={baseKey}
            keys={keys}
            months={months}
            maxMonth={maxMonth}
            span={span}
            setSpan={setSpan}
            spanSummary={spanSummary}
          />

          <StatsTopCategories span={span} spanSummary={spanSummary} />

          <div className="grid grid-cols-2 gap-2.5">
            <Link to="/money/new?type=expense" className="btn btn-outline text-[18px]">
              − 돈 쓴 것
            </Link>
            <Link to="/money/new?type=income" className="btn btn-outline text-[18px]">
              + 돈 들어온 것
            </Link>
          </div>
        </div>
      )}
    </SubPage>
  )
}
