import { useState } from 'react'
import { db } from '../db'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { getCategoryBudgets, setCategoryBudget } from '../lib/budget'
import { entryCategories } from '../lib/entryCategories'
import { formatCurrency } from '../utils/format'
import { PURCHASE_CATEGORY } from '../utils/ledger'
import { useToast } from './toastContext'

/** 설정: 분류별 한 달 예산 (식비 30만 원까지 등). 통계와 홈에서 넘었는지 보여 줌 */
export default function CategoryBudgetSetting() {
  const [budgets, setBudgets] = useState(getCategoryBudgets)
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const toast = useToast()
  const { data: entries } = useLiveQuery(() => db.entries.toArray(), [])
  const options = [PURCHASE_CATEGORY, ...entryCategories('expense', entries ?? [])]

  function save() {
    const value = Number(amount) || 0
    setBudgets(setCategoryBudget(category, value))
    toast(`${category} 예산을 ${formatCurrency(value)}으로 정했어요`)
    setCategory('')
    setAmount('')
  }

  function remove(name) {
    setBudgets(setCategoryBudget(name, 0))
    toast(`${name} 예산을 없앴어요`)
  }

  const list = Object.entries(budgets)

  return (
    <div className="space-y-3 p-4">
      {list.length === 0 ? (
        <p className="text-[16px] font-semibold text-ink-soft">
          「식비는 30만 원까지」처럼 분류마다 정해 두면, 넘었을 때 홈과 통계에서 알려 줘요
        </p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {list.map(([name, value]) => (
            <li key={name} className="flex items-center justify-between gap-3 py-2">
              <p className="min-w-0 truncate text-[18px] font-bold">
                {name} <span className="font-semibold text-ink-soft tabular">{formatCurrency(value)}</span>
              </p>
              <button
                type="button"
                onClick={() => remove(name)}
                className="btn btn-text-danger shrink-0 px-2"
                aria-label={`${name} 예산 없애기`}
              >
                없애기
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setAmount(budgets[e.target.value] ? String(budgets[e.target.value]) : '')
          }}
          className="field w-[8.5rem] shrink-0 py-2"
          aria-label="예산 정할 분류"
        >
          <option value="">분류 고르기</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="field flex min-w-0 flex-1 items-center gap-1">
          <input
            inputMode="numeric"
            value={amount ? Number(amount).toLocaleString('ko-KR') : ''}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="한 달 금액"
            className="min-w-0 flex-1 bg-transparent text-right text-[18px] font-bold outline-none tabular"
            aria-label="분류 예산 금액"
          />
          <span className="shrink-0 text-[17px] font-bold text-ink-muted">원</span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!category || !(Number(amount) > 0)}
          className="btn btn-primary w-full"
        >
          정하기
        </button>
      </div>
    </div>
  )
}
