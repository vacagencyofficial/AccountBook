import { useState } from 'react'
import {
  INSTALLMENT_CHOICES,
  MAX_INSTALLMENT,
  installmentLabel,
  monthlyInstallment,
} from '../utils/installment'
import { formatCurrency } from '../utils/format'

/**
 * 카드로 냈을 때 할부 개월 수 고르기 (일시불 · 2 · 3 · 6 · 10 · 12 · 직접)
 * value: 0(일시불) 또는 개월 수, total: 전체 금액(한 달 금액 안내용)
 */
export default function InstallmentPicker({ value, onChange, total = 0 }) {
  const months = Number(value) || 0
  const [custom, setCustom] = useState(() => months >= 2 && !INSTALLMENT_CHOICES.includes(months))
  const monthly = monthlyInstallment(total, months)

  return (
    <div className="mt-3 rounded-[12px] bg-wash p-3">
      <p className="text-[16px] font-bold text-ink">할부</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {INSTALLMENT_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={!custom && months === choice}
            onClick={() => {
              setCustom(false)
              onChange(choice)
            }}
            className={`chip ${!custom && months === choice ? 'chip-on' : ''}`}
          >
            {choice === 0 ? '일시불' : `${choice}개월`}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => {
            setCustom(true)
            if (INSTALLMENT_CHOICES.includes(months)) onChange(0)
          }}
          className={`chip ${custom ? 'chip-on' : ''}`}
        >
          직접
        </button>
      </div>

      {custom && (
        <label className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={2}
            max={MAX_INSTALLMENT}
            value={months || ''}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10) || 0
              onChange(Math.min(MAX_INSTALLMENT, Math.max(0, n)))
            }}
            placeholder="예: 24"
            className="field w-28 text-right"
            aria-label="할부 개월 수"
          />
          <span className="text-[17px] font-bold text-ink">개월</span>
          <span className="text-[15px] font-semibold text-ink-soft">(2~{MAX_INSTALLMENT})</span>
        </label>
      )}

      <p className="mt-2 text-[15px] font-semibold text-ink-muted" aria-live="polite">
        {monthly > 0
          ? `${installmentLabel(months)} · 한 달 약 ${formatCurrency(monthly)} (수수료 별도)`
          : '장부에는 산 날에 전액으로 적혀요'}
      </p>
    </div>
  )
}
