import { useState } from 'react'
import { db } from '../db'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { entryCategories } from '../lib/entryCategories'
import {
  WEEKDAYS,
  addRecurringRule,
  applyRecurringRules,
  describeRule,
  getRecurringRules,
  removeRecurringRule,
} from '../lib/recurring'
import { formatCurrency } from '../utils/format'
import { useToast } from './toastContext'

const emptyForm = {
  type: 'expense',
  every: 'month',
  amount: '',
  category: '',
  memo: '',
  day: '1',
  weekday: '1',
}

/** 설정: 매달·매주 나가는 돈·들어오는 돈 (월세, 통신비, 월급 등) */
export default function RecurringSetting() {
  const [rules, setRules] = useState(getRecurringRules)
  const [form, setForm] = useState(null)
  const toast = useToast()
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const { data: entries } = useLiveQuery(() => db.entries.toArray(), [])

  async function save() {
    setRules(addRecurringRule(form))
    setForm(null)
    const count = await applyRecurringRules()
    toast(
      count > 0
        ? `정해 두었어요. 이번 ${form.every === 'week' ? '주' : '달'} 것도 장부에 적었어요`
        : '정해 두었어요. 그날이 되면 장부에 적어요',
    )
  }

  function remove(rule) {
    setRules(removeRecurringRule(rule.id))
    toast('반복을 멈췄어요. 이미 적힌 기록은 그대로 있어요')
  }

  const categories = entryCategories(form?.type ?? 'expense', entries ?? [])
  const ready = form && Number(form.amount) > 0 && form.category

  return (
    <div className="space-y-3 p-4">
      {rules.length === 0 && !form && (
        <p className="text-[16px] font-semibold text-ink-soft">
          월세·통신비·월급처럼 매달(또는 매주) 같은 돈을 정해 두면, 그날이 되면 장부에 저절로 적어요
        </p>
      )}
      {rules.length > 0 && (
        <ul className="divide-y divide-line-soft">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[18px] font-bold">{rule.memo}</p>
                <p className="text-[16px] font-semibold text-ink-soft">
                  {describeRule(rule)} · {rule.type === 'income' ? '들어온 돈' : '나간 돈'} ·{' '}
                  <span className="tabular">{formatCurrency(rule.amount)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(rule)}
                className="btn btn-text-danger shrink-0 px-2"
              >
                멈추기
              </button>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <div className="space-y-3 rounded-[12px] bg-wash p-3">
          <div
            className="grid grid-cols-2 gap-1 rounded-[10px] bg-line-soft p-1"
            role="radiogroup"
            aria-label="종류"
          >
            {[
              ['expense', '나가는 돈'],
              ['income', '들어오는 돈'],
            ].map(([type, label]) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={form.type === type}
                onClick={() => setForm((prev) => ({ ...prev, type, category: '' }))}
                className={`min-h-[2.75rem] rounded-[8px] text-[17px] font-bold ${
                  form.type === type ? 'bg-paper text-brand shadow-[var(--shadow-card)]' : 'text-ink-soft'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={form.memo}
            onChange={(e) => update('memo', e.target.value)}
            placeholder="이름 (예: 가게 월세)"
            className="field"
            aria-label="이름"
          />
          <div className="field flex items-center gap-1">
            <input
              inputMode="numeric"
              value={form.amount ? Number(form.amount).toLocaleString('ko-KR') : ''}
              onChange={(e) => update('amount', e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="금액"
              className="min-w-0 flex-1 bg-transparent text-right text-[19px] font-bold outline-none tabular"
              aria-label="금액"
            />
            <span className="shrink-0 text-[18px] font-bold text-ink-muted">원</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => update('category', category)}
                aria-pressed={form.category === category}
                className={`chip ${form.category === category ? 'chip-on' : ''}`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="얼마마다">
            {[
              ['month', '매달'],
              ['week', '매주'],
            ].map(([every, label]) => (
              <button
                key={every}
                type="button"
                role="radio"
                aria-checked={form.every === every}
                onClick={() => update('every', every)}
                className={`chip ${form.every === every ? 'chip-on' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          {form.every === 'week' ? (
            <label className="flex items-center gap-2 text-[17px] font-bold">
              매주
              <select
                value={form.weekday}
                onChange={(e) => update('weekday', e.target.value)}
                className="field w-24 py-2 text-center"
                aria-label="요일"
              >
                {WEEKDAYS.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              요일에 적기
            </label>
          ) : (
            <label className="flex items-center gap-2 text-[17px] font-bold">
              매달
              <select
                value={form.day}
                onChange={(e) => update('day', e.target.value)}
                className="field w-24 py-2 text-center"
                aria-label="날짜"
              >
                {Array.from({ length: 28 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              일에 적기
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForm(null)} className="btn btn-outline">
              그만두기
            </button>
            <button type="button" onClick={save} disabled={!ready} className="btn btn-primary">
              정해 두기
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setForm(emptyForm)} className="btn btn-soft w-full">
          + 반복해서 적을 돈 더하기
        </button>
      )}
      {rules.length > 0 && (
        <p className="text-[16px] font-semibold text-ink-soft">
          이 폰에서만 정해 두면 돼요. 적힌 기록은 같이 쓰는 폰에도 보여요
        </p>
      )}
    </div>
  )
}
