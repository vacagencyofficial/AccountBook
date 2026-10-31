import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import HistoryFilters from '../components/HistoryFilters'
import PhotoGrid from '../components/PhotoGrid'
import HistoryHero from '../components/history/HistoryHero'
import HistoryCalendar from '../components/history/HistoryCalendar'
import HistoryList from '../components/history/HistoryList'
import HistoryBreakdown from '../components/history/HistoryBreakdown'
import HistoryFiles from '../components/history/HistoryFiles'
import { IconSearch } from '../components/Icons'
import { db } from '../db'
import { attachShopAndPhoto } from '../db/queries'
import { emptyFind, useHistoryData } from '../hooks/useHistoryData'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { useToday } from '../hooks/useToday'
import { getMonthRange } from '../utils/dateRange'

/** 장부: 달마다(또는 찾은) 상품·가계부 기록을 결산·달력·목록·사진으로 */
export default function HistoryPage() {
  const today = useToday()
  const location = useLocation()
  // 통계에서 달을 누르고 오면 그달 장부 ('2026-09')
  const startMonth = location.state?.month
  const [month, setMonth] = useState(() => {
    if (/^\d{4}-\d{2}$/.test(startMonth ?? '')) {
      return { year: Number(startMonth.slice(0, 4)), month: Number(startMonth.slice(5)) - 1 }
    }
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  // 기록을 보고 돌아와도 보던 방법(달력·목록·사진) 그대로
  const [view, setViewState] = useState(() => sessionStorage.getItem('sailp-history-view') || 'calendar')
  const setView = (next) => {
    setViewState(next)
    sessionStorage.setItem('sailp-history-view', next)
  }
  const [selectedDate, setSelectedDate] = useState(() =>
    startMonth && !today.startsWith(startMonth) ? null : today,
  )
  // 홈의 「찾기」로 들어오면 그 말로 모든 달에서 찾기
  const homeQuery = location.state?.query
  const [find, setFind] = useState(() =>
    homeQuery ? { ...emptyFind, query: homeQuery, allMonths: true } : emptyFind,
  )
  const [showFind, setShowFind] = useState(Boolean(homeQuery))

  const { data: items, isLoading } = useLiveQuery(async () => {
    const rows = await db.items.orderBy('createdAt').reverse().toArray()
    return attachShopAndPhoto(rows)
  }, [])
  const { data: shops } = useLiveQuery(() => db.shops.orderBy('name').toArray(), [])
  const { data: entries } = useLiveQuery(() => db.entries.orderBy('createdAt').reverse().toArray(), [])

  const monthRange = useMemo(() => getMonthRange(month.year, month.month), [month])
  const data = useHistoryData({ items, entries, find, monthRange })
  const { hasFind, searchAll, filteredItems, filteredEntries, summary, ledger, profit } = data
  const isThisMonth = monthRange.start <= today && today <= monthRange.end

  function moveMonth(diff) {
    const d = new Date(month.year, month.month + diff, 1)
    const next = { year: d.getFullYear(), month: d.getMonth() }
    const range = getMonthRange(next.year, next.month)
    setMonth(next)
    setSelectedDate(range.start <= today && today <= range.end ? today : null)
  }

  return (
    <div>
      <PageHeader
        title="장부"
        action={
          <div className="flex gap-2">
            <Link to="/stats" className="btn btn-outline px-3 text-[17px]">
              통계
            </Link>
            <button
              type="button"
              onClick={() => setShowFind((v) => !v)}
              className={`btn ${showFind || hasFind ? 'btn-primary' : 'btn-outline'} px-3 text-[17px]`}
              aria-expanded={showFind}
            >
              <IconSearch className="h-5 w-5" />
              찾기{hasFind ? ' 중' : ''}
            </button>
          </div>
        }
      />

      <div className="px-4">
        {showFind && (
          <div className="card mb-4 p-4">
            <HistoryFilters
              filters={find}
              entryCategories={[...new Set((entries ?? []).map((entry) => entry.category).filter(Boolean))]}
              shops={shops}
              onChange={(key, value) => setFind((prev) => ({ ...prev, [key]: value }))}
              onReset={() => setFind(emptyFind)}
              hasActiveFilters={hasFind}
            />
          </div>
        )}

        {!searchAll && (
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
            <p className="text-[23px] font-extrabold">
              {month.year}년 {month.month + 1}월
            </p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="btn btn-outline px-0 text-[30px] leading-none"
              style={{ width: '3.5rem' }}
              aria-label="다음 달"
            >
              ›
            </button>
          </div>
        )}

        <HistoryHero
          label={searchAll ? '찾은 기록에서 나간 돈' : `${month.month + 1}월에 나간 돈`}
          isLoading={isLoading}
          ledger={ledger}
          summary={summary}
          profit={profit}
          showSettlement={filteredEntries.length > 0}
        />

        {hasFind && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-[10px] bg-brand-soft px-3 py-2">
            <p className="text-[16px] font-bold text-brand">찾는 조건이 걸려 있어요</p>
            <button
              type="button"
              onClick={() => setFind(emptyFind)}
              className="text-[16px] font-bold text-brand underline"
            >
              조건 지우기
            </button>
          </div>
        )}

        {!searchAll && (
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-[12px] bg-line-soft p-1" role="tablist">
            {[
              ['calendar', '달력'],
              ['list', '목록'],
              ['photos', '사진'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={`min-h-[3rem] rounded-[9px] text-[18px] font-bold ${
                  view === key ? 'bg-paper text-brand shadow-[var(--shadow-card)]' : 'text-ink-soft'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="skeleton mt-4 h-72" />
        ) : !searchAll && view === 'calendar' ? (
          <HistoryCalendar
            month={month}
            today={today}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            isThisMonth={isThisMonth}
            data={data}
          />
        ) : !searchAll && view === 'photos' ? (
          <div className="mt-4">
            <PhotoGrid items={filteredItems} emptyTitle="이 달에는 사진이 없어요" />
          </div>
        ) : filteredItems.length + filteredEntries.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={hasFind ? '찾는 기록이 없어요' : '이 달에는 기록이 없어요'}
              description={
                hasFind ? '「찾기」 조건을 바꿔 보세요.' : '「상품 입력」으로 기록하면 여기에 쌓여요.'
              }
            />
          </div>
        ) : (
          <HistoryList searchAll={searchAll} data={data} />
        )}

        <HistoryBreakdown
          ledger={ledger}
          summary={summary}
          categoryBreakdown={data.categoryBreakdown}
          shopBreakdown={data.shopBreakdown}
        />

        <HistoryFiles
          items={items}
          entries={entries}
          shownItems={filteredItems}
          shownEntries={filteredEntries}
          shownLabel={searchAll ? '찾은 기록' : `${month.month + 1}월 기록`}
        />
      </div>
    </div>
  )
}
