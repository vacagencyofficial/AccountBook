import { useState } from 'react'
import { getMonthBudget, setMonthBudget } from '../lib/budget'
import { useToast } from './Toast'

const QUICK = [1_000_000, 3_000_000, 5_000_000, 10_000_000]

function formatInput(digits) {
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

/** 설정: 한 달 예산. 정해 두면 홈에서 얼마나 썼는지 보여 줌 */
export default function BudgetSetting() {
  const [value, setValue] = useState(() => String(getMonthBudget() || ''))
  const saved = getMonthBudget()
  const toast = useToast()

  function save(amount) {
    setMonthBudget(amount)
    setValue(amount ? String(amount) : '')
    toast(amount ? '예산을 정했어요. 홈에서 볼 수 있어요' : '예산을 지웠어요')
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <div className="field flex min-w-0 flex-1 items-center gap-1">
          <input
            inputMode="numeric"
            value={formatInput(value)}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="예: 3,000,000"
            className="min-w-0 flex-1 bg-transparent text-right text-[19px] font-bold outline-none tabular"
            aria-label="한 달 예산"
          />
          <span className="shrink-0 text-[18px] font-bold text-ink-muted">원</span>
        </div>
        <button
          type="button"
          onClick={() => save(Number(value) || 0)}
          disabled={(Number(value) || 0) === saved}
          className="btn btn-primary shrink-0"
        >
          저장
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => setValue(String(amount))}
            className="chip min-h-[2.75rem] px-3"
          >
            {amount / 10_000}만
          </button>
        ))}
        {saved > 0 && (
          <button type="button" onClick={() => save(0)} className="chip min-h-[2.75rem] px-3 text-ink-soft">
            예산 없애기
          </button>
        )}
      </div>
      <p className="text-[16px] font-semibold text-ink-soft">
        정해 두면 홈에 이번 달 얼마나 썼는지 보여 줘요
      </p>
    </div>
  )
}
