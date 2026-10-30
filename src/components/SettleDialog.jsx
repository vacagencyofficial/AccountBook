import { formatDateLabel } from '../utils/format'

/**
 * 외상 갚음: 가계부에서 이 돈을 언제 나간 돈으로 볼지 고름.
 * 「오늘 나간 돈으로」면 갚은 날, 「산 날 그대로」면 산 날에 셈
 */
export default function SettleDialog({ count = 1, buyDate, onToday, onBuyDate, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="card w-full max-w-sm p-5" role="dialog" aria-modal="true" aria-label="외상 갚음">
        <h3 className="text-[20px] font-extrabold text-ink">
          {count > 1 ? `외상 ${count}건을 갚았나요?` : '외상을 갚았나요?'}
        </h3>
        <p className="mt-2 text-[17px] font-medium leading-relaxed text-ink-muted">
          가계부에서 이 돈을 언제 나간 돈으로 볼까요?
        </p>
        <div className="mt-5 space-y-2">
          <button type="button" onClick={onToday} className="btn btn-primary w-full">
            오늘 나간 돈으로
          </button>
          <button type="button" onClick={onBuyDate} className="btn btn-outline w-full">
            {count > 1 || !buyDate ? '산 날 그대로' : `산 날(${formatDateLabel(buyDate)}) 그대로`}
          </button>
          <button type="button" onClick={onCancel} className="btn w-full text-ink-muted">
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
