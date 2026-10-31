import { useMemo, useRef, useState } from 'react'
import ImportModeDialog from '../ImportModeDialog'
import { IconExcel } from '../Icons'

/**
 * 장부의 「엑셀로 받기 · 백업하기」 카드: 보고 있는 기록·전체 기간 엑셀, 엑셀 넣기, 사진 포함 백업.
 * shownLabel: '10월 기록' / '찾은 기록'
 */
export default function HistoryFiles({ items, entries, shownItems, shownEntries, shownLabel }) {
  const excelInputRef = useRef(null)
  const [showFiles, setShowFiles] = useState(false)
  const [includePhotos, setIncludePhotos] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingExcel, setPendingExcel] = useState(null)
  const [exportError, setExportError] = useState(null)
  const [importMessage, setImportMessage] = useState(null)

  const allEntries = entries ?? []
  const allItemsByDate = useMemo(
    () =>
      [...(items ?? [])].sort(
        (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0),
      ),
    [items],
  )
  const canExport = shownItems.length + shownEntries.length > 0 && !isExporting

  // scope: 'shown'(보고 있는 달·찾은 기록) / 'all'(처음부터 모든 기록)
  async function handleExport(scope = 'shown') {
    const target = scope === 'all' ? allItemsByDate : shownItems
    const targetEntries = scope === 'all' ? allEntries : shownEntries
    if (isExporting || target.length + targetEntries.length === 0) return
    setIsExporting(scope)
    setExportError(null)
    try {
      const { exportHistoryToExcel } = await import('../../utils/exportExcel')
      await exportHistoryToExcel(target, {
        includePhotos,
        fileLabel: scope === 'all' ? '전체' : '',
        entries: targetEntries,
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
      const { exportBackup } = await import('../../utils/backup')
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
      const { importHistoryFromExcel } = await import('../../utils/importExcel')
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

  return (
    <>
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
                : `${shownLabel} 엑셀로 받기 (${shownItems.length + shownEntries.length}건)`}
            </button>
            <button
              type="button"
              onClick={() => handleExport('all')}
              disabled={Boolean(isExporting) || allItemsByDate.length + allEntries.length === 0}
              className="btn btn-soft w-full"
            >
              <IconExcel className="h-5 w-5" />
              {isExporting === 'all'
                ? '만드는 중…'
                : `전체 기간 엑셀로 받기 (${allItemsByDate.length + allEntries.length}건)`}
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
    </>
  )
}
