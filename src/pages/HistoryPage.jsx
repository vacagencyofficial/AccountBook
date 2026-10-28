import { useMemo, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import HistoryFilters from '../components/HistoryFilters'
import ImportModeDialog from '../components/ImportModeDialog'
import ItemRow from '../components/ItemRow'
import { IconExcel, IconSearch } from '../components/Icons'
import { db } from '../db'
import { attachShopAndPhoto } from '../db/queries'
import { filterHistoryItems } from '../hooks/useHistoryFilters'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { formatCurrency, getToday, itemTotal } from '../utils/format'
import { formatDateString, getMonthRange } from '../utils/dateRange'
import { groupByCategory, groupByShop, isPurchased, summarizeItems } from '../utils/analytics'
import { formatManwon } from '../utils/labels'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const emptyFind = { shopId: 'all', category: 'all', status: 'all', query: '', allMonths: false }

function dayHeading(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${m}월 ${d}일 ${weekday}요일`
}

export default function HistoryPage() {
  const today = getToday()
  const excelInputRef = useRef(null)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [view, setView] = useState('calendar')
  const [selectedDate, setSelectedDate] = useState(today)
  const [find, setFind] = useState(emptyFind)
  const [showFind, setShowFind] = useState(false)
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

  const monthRange = useMemo(() => getMonthRange(month.year, month.month), [month])
  const hasFind =
    find.shopId !== 'all' || find.category !== 'all' || find.status !== 'all' || Boolean(find.query.trim())
  const searchAll = find.allMonths && hasFind

  const filteredItems = useMemo(
    () =>
      filterHistoryItems(items, { ...find, period: searchAll ? 'all' : 'month' }, searchAll ? {} : monthRange),
    [items, find, searchAll, monthRange],
  )

  const summary = useMemo(() => summarizeItems(filteredItems), [filteredItems])
  const shopBreakdown = useMemo(() => groupByShop(filteredItems).slice(0, 5), [filteredItems])
  const categoryBreakdown = useMemo(() => groupByCategory(filteredItems), [filteredItems])
  const [breakdownBy, setBreakdownBy] = useState('category')

  const byDate = useMemo(() => {
    const map = {}
    for (const item of filteredItems) (map[item.date] ??= []).push(item)
    return map
  }, [filteredItems])

  const isThisMonth = monthRange.start <= today && today <= monthRange.end
  const canExport = filteredItems.length > 0 && !isExporting

  function moveMonth(diff) {
    const d = new Date(month.year, month.month + diff, 1)
    const next = { year: d.getFullYear(), month: d.getMonth() }
    const range = getMonthRange(next.year, next.month)
    setMonth(next)
    setSelectedDate(range.start <= today && today <= range.end ? today : null)
  }

  async function handleExport() {
    if (!canExport) return
    setIsExporting(true)
    setExportError(null)
    try {
      const { exportHistoryToExcel } = await import('../utils/exportExcel')
      await exportHistoryToExcel(filteredItems, { includePhotos })
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
          ? `엑셀 내용으로 바꿨어요 (기록 ${result.items}건)`
          : `기록 ${result.items}건을 더했어요 (새 가게 ${result.shops}곳)`,
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
  const selectedItems = selectedDate ? byDate[selectedDate] ?? [] : []
  const selectedSummary = summarizeItems(selectedItems)
  const sortedDates = Object.keys(byDate).sort().reverse()

  return (
    <div>
      <PageHeader
        title="장부"
        action={
          <button
            type="button"
            onClick={() => setShowFind((v) => !v)}
            className={`btn ${showFind || hasFind ? 'btn-primary' : 'btn-outline'} text-[17px]`}
            aria-expanded={showFind}
          >
            <IconSearch className="h-5 w-5" />
            찾기{hasFind ? ' 중' : ''}
          </button>
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
            <button type="button" onClick={() => moveMonth(-1)} className="btn btn-outline px-0 text-[30px] leading-none" style={{ width: '3.5rem' }} aria-label="지난달">
              ‹
            </button>
            <p className="text-[23px] font-extrabold">
              {month.year}년 {month.month + 1}월
            </p>
            <button type="button" onClick={() => moveMonth(1)} className="btn btn-outline px-0 text-[30px] leading-none" style={{ width: '3.5rem' }} aria-label="다음 달">
              ›
            </button>
          </div>
        )}

        <div className="hero receipt px-5 pb-4 pt-4">
          <div className="hero-deco" aria-hidden />
          <p className="text-[17px] font-semibold opacity-85">
            {searchAll ? '찾은 기록에서 쓴 돈' : `${month.month + 1}월에 쓴 돈`}
          </p>
          <p className="text-[36px] font-extrabold leading-tight tracking-[-0.03em] tabular">
            {isLoading ? '…' : formatCurrency(summary.total)}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="hero-pill">
              {summary.count ? `${summary.count}건 · ${summary.qty}개` : '아직 산 것이 없어요'}
            </span>
            {summary.pendingCount > 0 && (
              <span className="hero-pill hero-pill-warn">
                고민 중·안 사요 {summary.pendingCount}건 따로
              </span>
            )}
          </div>
        </div>

        {hasFind && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-[10px] bg-brand-soft px-3 py-2">
            <p className="text-[16px] font-bold text-brand">찾는 조건이 걸려 있어요</p>
            <button type="button" onClick={() => setFind(emptyFind)} className="text-[16px] font-bold text-brand underline">
              조건 지우기
            </button>
          </div>
        )}

        {!searchAll && (
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-[12px] bg-line-soft p-1" role="tablist">
            {[
              ['calendar', '달력으로'],
              ['list', '목록으로'],
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
                  const total = dayItems.filter(isPurchased).reduce((sum, item) => sum + itemTotal(item), 0)
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
                        isSelected ? 'bg-brand text-white shadow-[0_6px_14px_rgb(30_58_138/0.3)]' : '',
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
                        <span className={`text-[16px] font-extrabold tracking-[-0.03em] ${isSelected ? 'text-white' : 'text-accent-dark'}`}>
                          {formatManwon(total)}
                        </span>
                      )}
                      {total === 0 && dayItems.length > 0 && (
                        <span className={`mt-1 h-2 w-2 rounded-full ${isSelected ? 'bg-white' : 'bg-warn'}`} aria-hidden />
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
                      {selectedItems.length === 0
                        ? '이날은 기록이 없어요'
                        : `${selectedItems.length}건 중 ${selectedSummary.count}건 샀어요`}
                    </p>
                  </div>
                  {selectedItems.length > 0 && (
                    <b className="text-[21px] font-extrabold text-brand tabular">{formatCurrency(selectedSummary.total)}</b>
                  )}
                </div>
                {selectedItems.length > 0 && (
                  <ul className="space-y-2.5">
                    {selectedItems.map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </section>
            )}
            {!selectedDate && !isThisMonth && (
              <p className="mt-4 text-center text-[16px] font-semibold text-ink-soft">날짜를 누르면 그날 기록이 나와요</p>
            )}
          </>
        ) : filteredItems.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={hasFind ? '찾는 기록이 없어요' : '이 달에는 기록이 없어요'}
              description={hasFind ? '「찾기」 조건을 바꿔 보세요.' : '「물건 적기」로 기록하면 여기에 쌓여요.'}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {sortedDates.map((date) => {
              const dayItems = byDate[date]
              const daySummary = summarizeItems(dayItems)
              return (
                <section key={date}>
                  <div className="mb-2 flex items-baseline justify-between px-0.5">
                    <h2 className="text-[18px] font-extrabold">
                      {dayHeading(date)} · {dayItems.length}건
                    </h2>
                    <b className="text-[18px] font-extrabold text-brand tabular">{formatCurrency(daySummary.total)}</b>
                  </div>
                  <ul className="space-y-2.5">
                    {dayItems.map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}

        {categoryBreakdown.length > 0 && (
          <div className="card mt-6 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[19px] font-extrabold text-ink">어디에 썼나요?</h3>
              <div className="flex gap-1 rounded-[10px] bg-line-soft p-1" role="tablist">
                {[
                  ['category', '옷 종류'],
                  ['shop', '가게'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={breakdownBy === key}
                    onClick={() => setBreakdownBy(key)}
                    className={`min-h-[2.6rem] rounded-[8px] px-3 text-[16px] font-bold ${
                      breakdownBy === key ? 'bg-paper text-brand shadow-[var(--shadow-card)]' : 'text-ink-soft'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <BarList
              rows={
                breakdownBy === 'category'
                  ? categoryBreakdown.map((row) => ({ key: row.category, label: row.category, value: row.total }))
                  : shopBreakdown.map((row) => ({
                      key: row.shopId,
                      label: row.shop?.name ?? '가게 정보 없음',
                      value: row.total,
                    }))
              }
              total={summary.total}
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
              <button type="button" onClick={handleExport} disabled={!canExport} className="btn btn-primary w-full">
                <IconExcel className="h-5 w-5" />
                {isExporting
                  ? '만드는 중…'
                  : `${searchAll ? '찾은 기록' : `${month.month + 1}월 기록`} 엑셀로 받기 (${filteredItems.length}건)`}
              </button>
              <button type="button" onClick={handleImportClick} disabled={isImporting} className="btn btn-soft w-full">
                {isImporting ? '넣는 중…' : '엑셀 파일 넣기'}
              </button>
              <button type="button" onClick={handleBackup} disabled={isBackingUp} className="btn btn-outline w-full">
                {isBackingUp ? '만드는 중…' : '사진 포함 전체 백업하기'}
              </button>
              <p className="text-[16px] font-semibold leading-snug text-ink-soft">
                엑셀은 표로 보는 파일이고, 전체 백업은 사진까지 담아 나중에 「설정」에서 되살릴 수 있는 파일이에요.
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
          description="「지금 기록에 더하기」는 있던 기록에 엑셀 내용을 더해요. 「지금 기록 지우고 바꾸기」는 장부를 비우고 엑셀로 채워요. (사진은 들어오지 않아요)"
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
