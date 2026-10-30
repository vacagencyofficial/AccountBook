import { useEffect, useState } from 'react'
import { deletePhotos } from '../db/mutations'
import { findOldPhotos } from '../lib/storageStatus'
import { formatFileSize } from '../utils/photoConfig'
import { useToast } from './Toast'

const PERIODS = [
  { months: 12, label: '1년 넘은' },
  { months: 6, label: '6개월 넘은' },
  { months: 3, label: '3개월 넘은' },
]

function monthsAgo(months) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 오래된 사진 정리: 먼저 사진까지 백업 파일로 저장한 뒤, 고른 기간보다 오래된 상품의 사진만 지움 */
export default function PhotoCleanup({ onClose, onDone }) {
  const [months, setMonths] = useState(12)
  // 고른 기간의 결과만 보여 주고, 기간을 바꾸면 새로 셀 때까지 「세는 중」
  const [counted, setCounted] = useState(null)
  const found = counted?.months === months ? counted.result : null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()

  useEffect(() => {
    let alive = true
    findOldPhotos(monthsAgo(months)).then((result) => alive && setCounted({ months, result }))
    return () => {
      alive = false
    }
  }, [months])

  async function run() {
    if (!found?.ids.length) return
    setBusy(true)
    setError(null)
    try {
      // 지우기 전에 반드시 백업 (실패하면 지우지 않음)
      const { exportBackup } = await import('../utils/backup')
      await exportBackup()
      await deletePhotos(found.ids)
      toast(`사진 ${found.ids.length}장을 정리했어요. 기록은 그대로예요`)
      onDone?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '정리하지 못했어요. 다시 해 주세요')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="card w-full max-w-sm p-5" role="dialog" aria-modal="true" aria-label="오래된 사진 정리">
        <h3 className="text-[20px] font-extrabold text-ink">오래된 사진 정리</h3>
        <p className="mt-2 text-[17px] font-medium leading-relaxed text-ink-muted">
          먼저 <b className="text-ink">사진까지 백업 파일로 저장</b>한 뒤, 오래된 상품의 사진만 지워요.
          기록(가격·가게 등)은 그대로 남고, 사진은 백업 파일로 되살릴 수 있어요.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="기간">
          {PERIODS.map((period) => (
            <button
              key={period.months}
              type="button"
              role="radio"
              aria-checked={months === period.months}
              onClick={() => setMonths(period.months)}
              className={`chip min-h-[3rem] px-2 ${months === period.months ? 'chip-on' : ''}`}
            >
              {period.label}
            </button>
          ))}
        </div>

        <p className="mt-3 min-h-[1.75rem] text-[17px] font-bold text-ink" aria-live="polite">
          {!found
            ? '세는 중…'
            : found.ids.length
              ? `사진 ${found.ids.length}장 · ${formatFileSize(found.bytes)} 비울 수 있어요`
              : '이 기간보다 오래된 사진이 없어요'}
        </p>
        {error && (
          <p className="mt-1 text-[16px] font-bold text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-outline">
            그만두기
          </button>
          <button
            type="button"
            onClick={run}
            disabled={busy || !found?.ids.length}
            className="btn btn-primary whitespace-normal leading-tight"
          >
            {busy ? '백업하는 중…' : '백업하고 정리'}
          </button>
        </div>
      </div>
    </div>
  )
}
