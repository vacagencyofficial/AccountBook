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
      <PageHeader title="장부" subtitle="필터 후 엑셀로 내보내기">
        <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
          <div>
            <p className="text-[12px] text-ink-muted">합계</p>
            <p className="mt-0.5 text-[22px] font-bold tabular tracking-[-0.03em] text-ink">
              {formatCurrency(summary.total)}
            </p>
          </div>
          <p className="text-[12px] text-ink-muted">
            {summary.count}건 · {summary.qty}장
          </p>
        </div>
      </PageHeader>

      <section className="space-y-0">
        <div className="border-b border-line px-4 py-4">
          <label className="mb-3 flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
              className="h-4 w-4 rounded-none border-line"
            />
            사진 썸네일 포함
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!canExport}
              className="flex-1 bg-ink py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              {isExporting ? '내보내는 중…' : '엑셀 내보내기'}
            </button>
            <button
              type="button"
              onClick={handleBackup}
              disabled={isBackingUp}
              className="flex-1 border border-line py-2.5 text-[13px] font-medium text-ink disabled:opacity-50"
            >
              {isBackingUp ? '백업 중…' : '전체 백업'}
            </button>
          </div>
          {exportError && <p className="mt-2 text-[12px] text-red-600">{exportError}</p>}
        </div>

        {(shopBreakdown.length > 0 || categoryBreakdown.length > 0) && (
          <div className="grid grid-cols-2 gap-0 border-b border-line">
            <div className="border-r border-line px-4 py-3">
              <h3 className="text-[12px] font-bold text-ink">가게 TOP</h3>
              <ul className="mt-2 space-y-1.5">
                {shopBreakdown.map((row) => (
                  <li key={row.shopId} className="flex justify-between gap-2 text-[12px]">
                    <span className="truncate text-ink-muted">{row.shop?.name ?? '-'}</span>
                    <span className="tabular text-ink">{formatCurrency(row.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-3">
              <h3 className="text-[12px] font-bold text-ink">카테고리</h3>
              <ul className="mt-2 space-y-1.5">
                {categoryBreakdown.map((row) => (
                  <li key={row.category} className="flex justify-between gap-2 text-[12px]">
                    <span className="text-ink-muted">{row.category}</span>
                    <span className="tabular text-ink">{formatCurrency(row.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="border-b border-line px-4 py-4">
          <HistoryFilters
            filters={filters}
            shops={shops}
            onChange={updateFilter}
            onReset={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        <div className="px-4 py-2">
          {isLoading ? (
            <LoadingList />
          ) : hasNoData ? (
            <EmptyState title="사입 내역이 없습니다" description="기록을 추가하면 여기에 표시됩니다" />
          ) : isEmpty ? (
            <EmptyState title="조건에 맞는 내역이 없습니다" description="필터를 바꿔 보세요" />
          ) : (
            <ul className="divide-y divide-line">
              {filteredItems.map((item) => (
                <ItemRow key={item.id} item={item} showDate />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function LoadingList() {
  return (
    <div className="space-y-2 py-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton h-16" />
      ))}
    </div>
  )
}
