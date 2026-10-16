import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import HistoryFilters from '../components/HistoryFilters'
import ItemRow from '../components/ItemRow'
import { db } from '../db'
import { attachShopAndPhoto } from '../db/queries'
import { filterHistoryItems, useHistoryFilters } from '../hooks/useHistoryFilters'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { formatCurrency } from '../utils/format'
import { groupByCategory, groupByShop, summarizeItems } from '../utils/analytics'

export default function HistoryPage() {
  const { filters, dateRange, updateFilter, resetFilters, hasActiveFilters } = useHistoryFilters()
  const [includePhotos, setIncludePhotos] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [exportError, setExportError] = useState(null)

  const { data: items, isLoading } = useLiveQuery(async () => {
    const rows = await db.items.orderBy('createdAt').reverse().toArray()
    return attachShopAndPhoto(rows)
  }, [])

  const { data: shops } = useLiveQuery(() => db.shops.orderBy('name').toArray(), [])

  const filteredItems = useMemo(
    () => filterHistoryItems(items, filters, dateRange),
    [items, filters, dateRange],
  )

  const summary = useMemo(() => summarizeItems(filteredItems), [filteredItems])
  const shopBreakdown = useMemo(() => groupByShop(filteredItems).slice(0, 3), [filteredItems])
  const categoryBreakdown = useMemo(() => groupByCategory(filteredItems).slice(0, 4), [filteredItems])

  const isEmpty = !isLoading && filteredItems.length === 0
  const hasNoData = !isLoading && (items?.length ?? 0) === 0
  const canExport = filteredItems.length > 0 && !isExporting

  async function handleExport() {
    if (!canExport) return
    setIsExporting(true)
    setExportError(null)
    try {
      const { exportHistoryToExcel } = await import('../utils/exportExcel')
      await exportHistoryToExcel(filteredItems, { includePhotos })
    } catch (err) {
      setExportError(err instanceof Error ? err.message : '엑셀 내보내기에 실패했습니다')
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
      setExportError(err instanceof Error ? err.message : '백업 내보내기에 실패했습니다')
    } finally {
      setIsBackingUp(false)
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Ledger" title="장부" subtitle="필터하고 엑셀로 정리하세요">
        <div className="mt-4 grid grid-cols-3 gap-2">
          <SummaryPill label="건수" value={`${summary.count}`} />
          <SummaryPill label="수량" value={`${summary.qty}`} />
          <SummaryPill label="합계" value={formatCurrency(summary.total)} wide />
        </div>
      </PageHeader>

      <section className="space-y-4 px-4 py-5">
        <div className="rounded-2xl border border-line bg-raised p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">엑셀 / 백업</h2>
            <p className="text-xs text-ink-muted">현재 필터 결과가 엑셀에 반영됩니다</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
            />
            사진 썸네일 포함
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!canExport}
              className="flex-1 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {isExporting ? '내보내는 중…' : '엑셀 내보내기'}
            </button>
            <button
              type="button"
              onClick={handleBackup}
              disabled={isBackingUp}
              className="flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
            >
              {isBackingUp ? '백업 중…' : '전체 백업'}
            </button>
          </div>

          {exportError && <p className="text-xs text-red-600">{exportError}</p>}
        </div>

        {(shopBreakdown.length > 0 || categoryBreakdown.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {shopBreakdown.length > 0 && (
              <div className="rounded-2xl border border-line bg-raised p-4">
                <h3 className="text-xs font-semibold text-ink-muted">가게 TOP</h3>
                <ul className="mt-2 space-y-1.5">
                  {shopBreakdown.map((row) => (
                    <li key={row.shopId} className="flex justify-between text-sm">
                      <span className="truncate text-ink">{row.shop?.name ?? '-'}</span>
                      <span className="tabular font-medium text-ink">{formatCurrency(row.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {categoryBreakdown.length > 0 && (
              <div className="rounded-2xl border border-line bg-raised p-4">
                <h3 className="text-xs font-semibold text-ink-muted">카테고리</h3>
                <ul className="mt-2 space-y-1.5">
                  {categoryBreakdown.map((row) => (
                    <li key={row.category} className="flex justify-between text-sm">
                      <span className="text-ink">{row.category}</span>
                      <span className="tabular font-medium text-ink">{formatCurrency(row.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <HistoryFilters
          filters={filters}
          shops={shops}
          onChange={updateFilter}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {isLoading ? (
          <LoadingList />
        ) : hasNoData ? (
          <EmptyState
            title="사입 내역이 없습니다"
            description="기록을 추가하면 여기에서 조회할 수 있습니다"
          />
        ) : isEmpty ? (
          <EmptyState
            title="조건에 맞는 내역이 없습니다"
            description="필터를 변경하거나 초기화해 보세요"
          />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-line bg-raised divide-y divide-line">
            {filteredItems.map((item) => (
              <ItemRow key={item.id} item={item} showDate />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function SummaryPill({ label, value, wide }) {
  return (
    <div className={`rounded-xl border border-line bg-raised px-3 py-2 ${wide ? 'col-span-1' : ''}`}>
      <p className="text-[10px] font-medium text-ink-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold tabular text-ink">{value}</p>
    </div>
  )
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton h-20 rounded-2xl" />
      ))}
    </div>
  )
}
