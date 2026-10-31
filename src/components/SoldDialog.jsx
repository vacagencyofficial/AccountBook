import { useState } from 'react'
import { formatCurrency } from '../utils/format'

/** 「팔았어요」: 몇 개를 얼마에 팔았는지 → 가계부 들어온 돈(판매)으로 적음 */
export default function SoldDialog({ item, onSave, onCancel }) {
  const [count, setCount] = useState(Math.max(1, Number(item.qty) || 1))
  const [amount, setAmount] = useState(String((Number(item.salePrice) || 0) * count))
  const [edited, setEdited] = useState(false)

  function changeCount(next) {
    const n = Math.min(999, Math.max(1, next))
    setCount(n)
    // 금액을 직접 고치지 않았으면 판매가 × 개수로 따라감
    if (!edited) setAmount(String((Number(item.salePrice) || 0) * n))
  }

  const value = Number(amount) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="card w-full max-w-sm p-5" role="dialog" aria-modal="true" aria-label="팔았어요">
        <h3 className="text-[20px] font-extrabold text-ink">몇 개 팔았어요?</h3>
        <p className="mt-1 text-[17px] font-medium text-ink-muted">
          가계부에 오늘 들어온 돈(판매)으로 적어요
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => changeCount(count - 1)}
            className="btn btn-outline h-14 w-14 px-0 text-[28px]"
            aria-label="하나 빼기"
          >
            −
          </button>
          <p className="min-w-[5rem] text-center text-[30px] font-extrabold tabular" aria-live="polite">
            {count}개
          </p>
          <button
            type="button"
            onClick={() => changeCount(count + 1)}
            className="btn btn-outline h-14 w-14 px-0 text-[28px]"
            aria-label="하나 더하기"
          >
            +
          </button>
        </div>
        <label className="mt-4 block">
          <span className="label">받은 돈</span>
          <div className="field flex items-center gap-1">
            <input
              inputMode="numeric"
              value={value ? value.toLocaleString('ko-KR') : ''}
              onChange={(e) => {
                setEdited(true)
                setAmount(e.target.value.replace(/\D/g, '').slice(0, 10))
              }}
              className="min-w-0 flex-1 bg-transparent text-right text-[20px] font-bold outline-none tabular"
              aria-label="받은 돈"
            />
            <span className="shrink-0 text-[18px] font-bold text-ink-muted">원</span>
          </div>
        </label>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="btn btn-outline">
            취소
          </button>
          <button
            type="button"
            onClick={() => onSave(count, value)}
            disabled={value <= 0}
            className="btn bg-good text-white"
          >
            {value > 0 ? `${formatCurrency(value)} 적기` : '적기'}
          </button>
        </div>
      </div>
    </div>
  )
}
