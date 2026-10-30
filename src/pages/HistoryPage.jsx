import { useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import HistoryFilters from '../components/HistoryFilters'
import ImportModeDialog from '../components/ImportModeDialog'
import ItemRow from '../components/ItemRow'
import EntryRow from '../components/EntryRow'
import PhotoGrid from '../components/PhotoGrid'
import { IconExcel, IconSearch } from '../components/Icons'
import { db } from '../db'
import { attachShopAndPhoto } from '../db/queries'
import { filterHistoryItems } from '../hooks/useHistoryFilters'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { useToday } from '../hooks/useToday'
import { formatCurrency, itemTotal } from '../utils/format'
import { formatDateString, getMonthRange } from '../utils/dateRange'
import {
  groupByCategory,
  groupByShop,
  isPurchased,
  summarizeItems,
  summarizeProfit,
} from '../utils/analytics'
import { formatManwon, formatWonShort } from '../utils/labels'
import { summarizeLedger } from '../utils/ledger'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const emptyFind = { shopId: 'all', category: 'all', status: 'all', query: '', allMonths: false }

function dayHeading(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${m}월 ${d}일 ${weekday}요일`
}

export default function HistoryPage() {
  const today = useToday()
  const excelInputRef = useRef(null)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  // 기록을 보고 돌아와도 보던 방법(달력·목록·사진) 그대로
  const [view, setViewState] = useState(() => sessionStorage.getItem('sailp-history-view') || 'calendar')
  const setView = (next) => {
    setViewState(next)
    sessionStorage.setItem('sailp-history-view', next)
  }
  const [selectedDate, setSelectedDate] = useState(today)
  // 홈의 「찾기」로 들어오면 그 말로 모든 달에서 찾기
  const location = useLocation()
  const homeQuery = location.state?.query
  const [find, setFind] = useState(() =>
    homeQuery ? { ...emptyFind, query: homeQuery, allMonths: true } : emptyFind,
  )
  const [showFind, setShowFind] = useState(Boolean(homeQuery))
  const [showFiles, setShowFiles] = useState(false)
  const [includePhotos, setIncludePhotos] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingExcel, setPendingExcel] = useState(null)
  const [exportError, setExportError] = useState(null)
  const [importMessage, setImportMessage] = useState(null)

  const { data: items, isLoading } = useLiveQuery(async () => {
    const rows = await db.items.orderBy('createdAt').reverse().toArray()
    return attachShopAndPhoto(rows)
  }, [])

  const { data: shops } = useLiveQuery(() => db.shops.orderBy('name').toArray(), [])
  const { data: entries } = useLiveQuery(() => db.entries.orderBy('createdAt').reverse().toArray(), [])

  const monthRange = useMemo(() => getMonthRange(month.year, month.month), [month])
  const hasFind =
    find.shopId !== 'all' || find.category !== 'all' || find.status !== 'all' || Boolean(find.query.trim())
  const searchAll = find.allMonths && hasFind

  const filteredItems = useMemo(
    () =>
      filterHistoryItems(
        items,
        { ...find, period: searchAll ? 'all' : 'month' },
        searchAll ? {} : monthRange,
      ),
    [items, find, searchAll, monthRange],
  )

  // 가계부(사입 말고 다른 지출·수입): 가게·종류·상태로 찾을 때는 빼고, 찾는 말은 메모·분류에서
  const filteredEntries = useMemo(() => {
    if (find.shopId !== 'all' || find.category !== 'all' || find.status !== 'all') return []
    const query = find.query.trim().toLowerCase()
    return (entries ?? []).filter(
      (entry) =>
        (searchAll || (monthRange.start <= entry.date && entry.date <= monthRange.end)) &&
        (!query || `${entry.memo ?? ''} ${entry.category ?? ''}`.toLowerCase().includes(query)),
    )
  }, [entries, find, searchAll, monthRange])

  const summary = useMemo(() => summarizeItems(filteredItems), [filteredItems])
  const ledger = useMemo(
    () => summarizeLedger(filteredItems, filteredEntries),
    [filteredItems, filteredEntries],
  )
  const profit = useMemo(() => summarizeProfit(filteredItems), [filteredItems])
  const shopBreakdown = useMemo(() => groupByShop(filteredItems).slice(0, 5), [filteredItems])
  const categoryBreakdown = useMemo(() => groupByCategory(filteredItems), [filteredItems])
  const [breakdownBy, setBreakdownBy] = useState('all')

  const byDate = useMemo(() => {
    const map = {}
    for (const item of filteredItems) (map[item.date] ??= []).push(item)
    return map
  }, [filteredItems])
  const entriesByDate = useMemo(() => {
    const map = {}
    for (const entry of filteredEntries) (map[entry.date] ??= []).push(entry)
    return map
  }, [filteredEntries])

  const isThisMonth = monthRange.start <= today && today <= monthRange.end
  const canExport = filteredItems.length + filteredEntries.length > 0 && !isExporting
  const allItemsByDate = useMemo(
    () =>
      [...(items ?? [])].sort(
        (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0),
      ),
    [items],
  )

  function moveMonth(diff) {
    const d = new Date(month.year, month.month + diff, 1)
    const next = { year: d.getFullYear(), month: d.getMonth() }
    const range = getMonthRange(next.year, next.month)
    setMonth(next)
    setSelectedDate(range.start <= today && today <= range.end ? today : null)
  }

  // scope: 'shown'(보고 있는 달·찾은 기록) / 'all'(처음부터 모든 기록)
  async function handleExport(scope = 'shown') {
    const target = scope === 'all' ? allItemsByDate : filteredItems
    const targetEntries = scope === 'all' ? (entries ?? []) : filteredEntries
    if (isExporting || target.length + targetEntries.length === 0) return
    setIsExporting(scope)
    setExportError(null)
    try {
      const { exportHistoryToExcel } = await import('../utils/exportExcel')
      await exportHistoryToExcel(target, {
        includePhotos,
        fileLabel: scope === 'all' ? '전체' : '',
        entries: scope === 'all' ? (entries ?? []) : filteredEntries,
      })
    } catch (err) {
      setExportError(err instanceof Error ? err.message : '엑셀로 받지 못했어요')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleBackup() {
    setIsBackingUp(true)
    setExportError(null)
    try {
      const { exportBackup } = await import('../utils/backup')
      await exportBackup()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : '백업하지 못했어요')
    } finally {
      setIsBackingUp(false)
    }
  }

  function handleImportClick() {
    setExportError(null)
    setImportMessage(null)
    excelInputRef.current?.click()
  }

  function handleExcelSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setExportError('엑셀 파일(.xlsx)만 넣을 수 있어요. 옛날 .xls 파일은 엑셀에서 다시 저장해 주세요.')
      return
    }
    setPendingExcel(file)
  }

  async function handleImportExcel(mode) {
    if (!pendingExcel) return
    setIsImporting(true)
    setExportError(null)
    setImportMessage(null)
    try {
      const { importHistoryFromExcel } = await import('../utils/importExcel')
      const result = await importHistoryFromExcel(pendingExcel, mode)
      setPendingExcel(null)
      setImportMessage(
        mode === 'overwrite'
          ? `엑셀 내용으로 바꿨어요 (기록 ${result.items}건${result.entries ? ` · 가계부 ${result.entries}건` : ''})`
          : `기록 ${result.items}건${result.entries ? ` · 가계부 ${result.entries}건` : ''}을 더했어요 (새 가게 ${result.shops}곳)${
              result.skipped ? ` · 이미 있는 ${result.skipped}건은 건너뛰었어요` : ''
            }`,
      )
    } catch (err) {
      setExportError(err instanceof Error ? err.message : '엑셀 파일을 넣지 못했어요')
    } finally {
      setIsImporting(false)
    }
  }

  // 달력 칸: 앞쪽 빈칸 + 1일~말일
  const firstWeekday = new Date(month.year, month.month, 1).getDay()
  const lastDay = new Date(month.year, month.month + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => formatDateString(new Date(month.year, month.month, i + 1))),
  ]
  const selectedItems = selectedDate ? (byDate[selectedDate] ?? []) : []
  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] ?? []) : []
  const selectedSummary = summarizeItems(selectedItems)
  const selectedLedger = summarizeLedger(selectedItems, selectedEntries)
  const selectedCount = selectedItems.length + selectedEntries.length
  const sortedDates = [...new Set([...Object.keys(byDate), ...Object.keys(entriesByDate)])].sort().reverse()

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

        <div className="hero px-5 pb-4 pt-4">
          <p className="text-[17px] font-semibold opacity-85">
            {searchAll ? '찾은 기록에서 나간 돈' : `${month.month + 1}월에 나간 돈`}
          </p>
          <p className="text-[clamp(28px,9vw,36px)] font-extrabold leading-tight tracking-[-0.03em] tabular [overflow-wrap:anywhere]">
            {isLoading ? '…' : formatCurrency(ledger.expense)}
          </p>
          <p className="mt-1 text-[16px] font-semibold opacity-80">
            {ledger.otherExpense > 0
              ? `사입 ${formatWonShort(ledger.purchase)} · 그 밖에 ${formatWonShort(ledger.otherExpense)}`
              : summary.count
                ? `${summary.count}건 · ${summary.qty}개`
                : '아직 산 것이 없어요'}
            {summary.pendingCount > 0 && ` · 고민 중·안 사요 ${summary.pendingCount}건 제외`}
          </p>
          {filteredEntries.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/15 pt-2 text-[16px] font-semibold">
              <p>
                <span className="block opacity-80">들어온 돈</span>
                <b className="text-[18px] font-extrabold tabular">{formatCurrency(ledger.income)}</b>
              </p>
              <p className="text-right">
                <span className="block opacity-80">남은 돈</span>
                <b
                  className={`text-[18px] font-extrabold tabular ${ledger.balance < 0 ? 'text-[#fdba74]' : ''}`}
                >
                  {ledger.balance < 0 ? '−' : ''}
                  {formatCurrency(Math.abs(ledger.balance))}
                </b>
              </p>
            </div>
          )}
          {profit.count > 0 && (
            <p className="mt-2 border-t border-white/15 pt-2 text-[16px] font-semibold">
              <span className="opacity-80">판매가 적은 {profit.count}건 · 남는 돈 </span>
              <b className="text-[18px] font-extrabold tabular">{formatCurrency(profit.total)}</b>
            </p>
          )}
        </div>

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
          <>
            <div className="card mt-3 px-2 pb-2 pt-3">
              <div className="grid grid-cols-7 pb-1 text-center text-[16px] font-bold text-ink-soft">
                {WEEKDAYS.map((w, i) => (
                  <span key={w} className={i === 0 ? 'text-red-600' : ''}>
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((date, index) => {
                  if (!date) return <span key={`blank-${index}`} />
                  const dayItems = byDate[date] ?? []
                  const dayEntries = entriesByDate[date] ?? []
                  const total =
                    dayItems.filter(isPurchased).reduce((sum, item) => sum + itemTotal(item), 0) +
                    dayEntries
                      .filter((entry) => entry.type !== 'income')
                      .reduce((sum, entry) => sum + entry.amount, 0)
                  const income = dayEntries
                    .filter((entry) => entry.type === 'income')
                    .reduce((sum, entry) => sum + entry.amount, 0)
                  const isSelected = date === selectedDate
                  const isFuture = date > today
                  const isSunday = index % 7 === 0
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={[
                        'flex min-h-[3.35rem] flex-col items-center justify-start rounded-[10px] pt-1',
                        isSelected ? 'bg-brand text-white' : '',
                        !isSelected && date === today ? 'ring-2 ring-accent ring-inset' : '',
                      ].join(' ')}
                      aria-label={`${dayHeading(date)}${total ? ` ${formatCurrency(total)}` : ''}`}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={`text-[17px] font-bold ${
                          isSelected ? '' : isFuture ? 'text-line' : isSunday ? 'text-red-600' : 'text-ink'
                        }`}
                      >
                        {Number(date.slice(8))}
                      </span>
                      {total > 0 && (
                        <span
                          className={`text-[16px] font-extrabold tracking-[-0.03em] ${isSelected ? 'text-white' : 'text-accent-dark'}`}
                        >
                          {formatManwon(total)}
                        </span>
                      )}
                      {total === 0 && income > 0 && (
                        <span
                          className={`text-[16px] font-extrabold tracking-[-0.03em] ${isSelected ? 'text-white' : 'text-good'}`}
                        >
                          +{formatManwon(income)}
                        </span>
                      )}
                      {total === 0 && income === 0 && dayItems.length > 0 && (
                        <span
                          className={`mt-1 h-2 w-2 rounded-full ${isSelected ? 'bg-white' : 'bg-warn'}`}
                          aria-hidden
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedDate && (
              <section className="mt-5">
                <div className="mb-3 flex items-end justify-between px-0.5">
                  <div>
                    <h2 className="text-[20px] font-extrabold">{dayHeading(selectedDate)}</h2>
                    <p className="text-[16px] font-semibold text-ink-soft">
                      {selectedCount === 0
                        ? '이날은 기록이 없어요'
                        : selectedEntries.length
                          ? `${selectedCount}건`
                          : `${selectedItems.length}건 중 ${selectedSummary.count}건 샀어요`}
                    </p>
                  </div>
                  {selectedCount > 0 && (
                    <b className="text-[21px] font-extrabold text-brand tabular">
                      {formatCurrency(selectedLedger.expense)}
                    </b>
                  )}
                </div>
                {selectedCount > 0 && (
                  <ul className="space-y-2.5">
                    {selectedItems.map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                    {selectedEntries.map((entry) => (
                      <EntryRow key={`entry-${entry.id}`} entry={entry} />
                    ))}
                  </ul>
                )}
              </section>
            )}
            {!selectedDate && !isThisMonth && (
              <p className="mt-4 text-center text-[16px] font-semibold text-ink-soft">
                날짜를 누르면 그날 기록이 나와요
              </p>
            )}
          </>
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
          <div className="mt-4 space-y-5">
            {sortedDates.map((date) => {
              const dayItems = byDate[date] ?? []
              const dayEntries = entriesByDate[date] ?? []
              const daySummary = summarizeLedger(dayItems, dayEntries)
              return (
                <section key={date}>
                  <div className="mb-2 flex items-baseline justify-between px-0.5">
                    <h2 className="text-[18px] font-extrabold">
                      {dayHeading(date)} · {dayItems.length + dayEntries.length}건
                    </h2>
                    <b className="text-[18px] font-extrabold text-brand tabular">
                      {formatCurrency(daySummary.expense)}
                    </b>
                  </div>
                  <ul className="space-y-2.5">
                    {dayItems.map((item) => (
                      <ItemRow key={item.id} item={item} showDate={searchAll} />
                    ))}
                    {dayEntries.map((entry) => (
                      <EntryRow key={`entry-${entry.id}`} entry={entry} />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}

        {ledger.byCategory.length > 0 && (
          <div className="card mt-6 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[19px] font-extrabold text-ink">어디에 썼나요?</h3>
              <div className="flex gap-1 rounded-[10px] bg-line-soft p-1" role="tablist">
                {[
                  ['all', '전체'],
                  ['category', '옷 종류'],
                  ['shop', '가게'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={breakdownBy === key}
                    onClick={() => setBreakdownBy(key)}
                    className={`min-h-[2.6rem] rounded-[8px] px-2.5 text-[16px] font-bold ${
                      breakdownBy === key
                        ? 'bg-paper text-brand shadow-[var(--shadow-card)]'
                        : 'text-ink-soft'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <BarList
              rows={
                breakdownBy === 'all'
                  ? ledger.byCategory.map((row) => ({ key: row.name, label: row.name, value: row.amount }))
                  : breakdownBy === 'category'
                    ? categoryBreakdown.map((row) => ({
                        key: row.category,
                        label: row.category,
                        value: row.total,
                      }))
                    : shopBreakdown.map((row) => ({
                        key: row.shopId,
                        label: row.shop?.name ?? '가게 정보 없음',
                        value: row.total,
                      }))
              }
              total={breakdownBy === 'all' ? ledger.expense : summary.total}
            />
          </div>
        )}

        <div className="card mt-4 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFiles((v) => !v)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            aria-expanded={showFiles}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-good-soft text-good">
              <IconExcel className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[18px] font-extrabold">엑셀로 받기 · 백업하기</b>
              <span className="text-[16px] font-semibold text-ink-soft">장부를 파일로 저장하거나 넣어요</span>
            </span>
            <span className="text-[24px] text-ink-soft" aria-hidden>
              {showFiles ? '⌃' : '›'}
            </span>
          </button>

          {showFiles && (
            <div className="space-y-2.5 border-t border-line-soft px-4 pb-4 pt-3">
              <label className="flex min-h-[3rem] items-center gap-3 text-[17px] font-bold text-ink">
                <input
                  type="checkbox"
                  checked={includePhotos}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                  className="h-6 w-6 accent-[var(--color-brand)]"
                />
                엑셀에 사진도 같이 넣기
              </label>
              <button
                type="button"
                onClick={() => handleExport()}
                disabled={!canExport}
                className="btn btn-primary w-full"
              >
                <IconExcel className="h-5 w-5" />
                {isExporting === 'shown'
                  ? '만드는 중…'
                  : `${searchAll ? '찾은 기록' : `${month.month + 1}월 기록`} 엑셀로 받기 (${filteredItems.length + filteredEntries.length}건)`}
              </button>
              <button
                type="button"
                onClick={() => handleExport('all')}
                disabled={Boolean(isExporting) || allItemsByDate.length + (entries ?? []).length === 0}
                className="btn btn-soft w-full"
              >
                <IconExcel className="h-5 w-5" />
                {isExporting === 'all'
                  ? '만드는 중…'
                  : `전체 기간 엑셀로 받기 (${allItemsByDate.length + (entries ?? []).length}건)`}
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isImporting}
                className="btn btn-soft w-full"
              >
                {isImporting ? '넣는 중…' : '엑셀 파일 넣기'}
              </button>
              <button
                type="button"
                onClick={handleBackup}
                disabled={isBackingUp}
                className="btn btn-outline w-full"
              >
                {isBackingUp ? '만드는 중…' : '사진 포함 전체 백업하기'}
              </button>
              <p className="text-[16px] font-semibold leading-snug text-ink-soft">
                엑셀은 표로 보는 파일이고, 전체 백업은 사진까지 담아 나중에 「설정」에서 되살릴 수 있는
                파일이에요.
              </p>
              {importMessage && <p className="text-[16px] font-bold text-good">{importMessage}</p>}
              {exportError && (
                <p className="text-[16px] font-bold text-red-700" role="alert">
                  {exportError}
                </p>
              )}
            </div>
          )}
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleExcelSelected}
          />
        </div>
      </div>

      {pendingExcel && (
        <ImportModeDialog
          title="엑셀 파일 넣기"
          description="「지금 기록에 더하기」는 있던 기록에 엑셀 내용을 더해요. 「지금 기록 지우고 바꾸기」는 장부를 비우고 엑셀로 채워요. 엑셀에서는 사진이 들어오지 않아서, 바꾸면 지금 사진도 지워져요. 사진까지 옮기려면 「설정 → 백업」을 써 주세요."
          disabled={isImporting}
          onOverwrite={() => handleImportExcel('overwrite')}
          onMerge={() => handleImportExcel('merge')}
          onCancel={() => setPendingExcel(null)}
        />
      )}
    </div>
  )
}

/** 산 금액 비교용 가로 막대 (한 가지 색, 막대 끝에 금액과 비율) */
function BarList({ rows, total }) {
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const share = total ? Math.round((row.value / total) * 100) : 0
        return (
          <li key={row.key} aria-label={`${row.label} ${formatCurrency(row.value)}, ${share}%`}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-[17px] font-bold text-ink">{row.label}</span>
              <span className="shrink-0 text-[17px] font-bold text-ink tabular">
                {formatManwon(row.value)}
                <span className="ml-1.5 text-[16px] font-semibold text-ink-soft">{share}%</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-line-soft" aria-hidden>
              <div
                className="h-3 rounded-full bg-brand"
                style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
