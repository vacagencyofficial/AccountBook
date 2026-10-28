import { useMemo, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import HistoryFilters from '../components/HistoryFilters'
import ImportModeDialog from '../components/ImportModeDialog'
import ItemRow from '../components/ItemRow'
import { IconExcel, IconMoney } from '../components/Icons'
import { db } from '../db'
import { attachShopAndPhoto } from '../db/queries'
import { filterHistoryItems, useHistoryFilters } from '../hooks/useHistoryFilters'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { formatCurrency } from '../utils/format'
import { groupByCategory, groupByShop, summarizeItems } from '../utils/analytics'

export default function HistoryPage() {
  const { filters, dateRange, updateFilter, resetFilters, hasActiveFilters } = useHistoryFilters()
  const excelInputRef = useRef(null)
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

  function handleImportClick() {
    setExportError(null)
    setImportMessage(null)
    excelInputRef.current?.click()
  }

  function handleExcelSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setExportError('엑셀 파일(.xlsx)만 불러올 수 있습니다')
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
          ? `엑셀로 덮어썼습니다. (${result.items}건)`
          : `엑셀을 병합했습니다. (가게 ${result.shops} · 품목 ${result.items}건)`,
      )
    } catch (err) {
      setExportError(err instanceof Error ? err.message : '엑셀 불러오기에 실패했습니다')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div>
      <PageHeader title="장부" subtitle="엑셀로 저장하고 불러오기" tone="ledger">
        <div className="mt-4 flex items-end justify-between rounded-2xl border-2 border-ledger/25 bg-paper px-4 py-3">
          <div>
            <p className="inline-flex items-center gap-1 text-[13px] font-bold text-ledger">
              <IconMoney className="h-4 w-4" />
              합계
            </p>
            <p className="mt-1 text-[26px] font-black tabular text-ink">
              {formatCurrency(summary.total)}
            </p>
          </div>
          <p className="text-[15px] font-bold text-ink-muted">
            {summary.count}건 · {summary.qty}장
          </p>
        </div>
      </PageHeader>

      <section className="bg-paper">
        <div className="border-b-2 border-line px-4 py-4">
          <label className="mb-3 flex items-center gap-3 text-[16px] font-bold text-ink">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
              className="h-5 w-5 rounded border-line"
            />
            사진도 엑셀에 넣기
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!canExport}
              className="tap-target flex items-center justify-center gap-2 rounded-2xl bg-ledger text-[16px] font-black text-white disabled:opacity-40"
            >
              <IconExcel className="h-5 w-5" />
              {isExporting ? '내보내는 중…' : '엑셀 내보내기'}
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              disabled={isImporting}
              className="tap-target flex items-center justify-center gap-2 rounded-2xl border-2 border-ledger bg-ledger/10 text-[16px] font-black text-ledger disabled:opacity-50"
            >
              <IconExcel className="h-5 w-5" />
              {isImporting ? '불러오는 중…' : '엑셀 불러오기'}
            </button>
            <button
              type="button"
              onClick={handleBackup}
              disabled={isBackingUp}
              className="tap-target col-span-2 rounded-2xl border-2 border-line text-[16px] font-bold text-ink disabled:opacity-50"
            >
              {isBackingUp ? '백업 중…' : '전체 백업 (ZIP)'}
            </button>
          </div>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleExcelSelected}
          />
          {importMessage && <p className="mt-2 text-[14px] font-bold text-ledger">{importMessage}</p>}
          {exportError && <p className="mt-2 text-[14px] font-bold text-red-600">{exportError}</p>}
        </div>

        {(shopBreakdown.length > 0 || categoryBreakdown.length > 0) && (
          <div className="grid grid-cols-2 border-b-2 border-line">
            <div className="border-r-2 border-line px-4 py-3">
              <h3 className="text-[14px] font-black text-ink">가게 TOP</h3>
              <ul className="mt-2 space-y-2">
                {shopBreakdown.map((row) => (
                  <li key={row.shopId} className="flex justify-between gap-2 text-[14px] font-semibold">
                    <span className="truncate text-ink-muted">{row.shop?.name ?? '-'}</span>
                    <span className="tabular text-ink">{formatCurrency(row.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-3">
              <h3 className="text-[14px] font-black text-ink">카테고리</h3>
              <ul className="mt-2 space-y-2">
                {categoryBreakdown.map((row) => (
                  <li key={row.category} className="flex justify-between gap-2 text-[14px] font-semibold">
                    <span className="text-ink-muted">{row.category}</span>
                    <span className="tabular text-ink">{formatCurrency(row.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="border-b-2 border-line px-4 py-4">
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
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20 rounded-2xl" />
              ))}
            </div>
          ) : hasNoData ? (
            <EmptyState title="사입 내역이 없습니다" description="기록을 추가하면 여기에 표시됩니다" />
          ) : isEmpty ? (
            <EmptyState title="조건에 맞는 내역이 없습니다" description="필터를 바꿔 보세요" />
          ) : (
            <ul className="divide-y-2 divide-line">
              {filteredItems.map((item) => (
                <ItemRow key={item.id} item={item} showDate />
              ))}
            </ul>
          )}
        </div>
      </section>

      {pendingExcel && (
        <ImportModeDialog
          title="엑셀 불러오기"
          description="덮어쓰기는 지금 장부를 지우고 엑셀로 채웁니다. 병합은 기존 기록에 엑셀 내용을 추가합니다. (사진은 엑셀에서 가져오지 않습니다)"
          disabled={isImporting}
          onOverwrite={() => handleImportExcel('overwrite')}
          onMerge={() => handleImportExcel('merge')}
          onCancel={() => setPendingExcel(null)}
        />
      )}
    </div>
  )
}
