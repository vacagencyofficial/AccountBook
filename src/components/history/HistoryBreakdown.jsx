import { useState } from 'react'
import { formatCurrency } from '../../utils/format'
import { formatManwon } from '../../utils/labels'

/** 「어디에 썼나요?」: 전체(사입 + 가계부 분류) / 옷 종류 / 가게별 나간 돈 */
export default function HistoryBreakdown({ ledger, summary, categoryBreakdown, shopBreakdown }) {
  const [breakdownBy, setBreakdownBy] = useState('all')
  if (ledger.byCategory.length === 0) return null

  return (
    <div className="card mt-6 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[19px] font-extrabold text-ink">어디에 썼나요?</h3>
        <div className="flex gap-1 rounded-[10px] bg-line-soft p-1" role="tablist">
          {[
            ['all', '전체'],
            ['category', '옷 종류'],
            ['shop', '가게'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={breakdownBy === key}
              onClick={() => setBreakdownBy(key)}
              className={`min-h-[2.6rem] rounded-[8px] px-2.5 text-[16px] font-bold ${
                breakdownBy === key ? 'bg-paper text-brand shadow-[var(--shadow-card)]' : 'text-ink-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <BarList
        rows={
          breakdownBy === 'all'
            ? ledger.byCategory.map((row) => ({ key: row.name, label: row.name, value: row.amount }))
            : breakdownBy === 'category'
              ? categoryBreakdown.map((row) => ({
                  key: row.category,
                  label: row.category,
                  value: row.total,
                }))
              : shopBreakdown.map((row) => ({
                  key: row.shopId,
                  label: row.shop?.name ?? '가게 정보 없음',
                  value: row.total,
                }))
        }
        total={breakdownBy === 'all' ? ledger.expense : summary.total}
      />
    </div>
  )
}

/** 산 금액 비교용 가로 막대 (한 가지 색, 막대 끝에 금액과 비율) */
function BarList({ rows, total }) {
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const share = total ? Math.round((row.value / total) * 100) : 0
        return (
          <li key={row.key} aria-label={`${row.label} ${formatCurrency(row.value)}, ${share}%`}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-[17px] font-bold text-ink">{row.label}</span>
              <span className="shrink-0 text-[17px] font-bold text-ink tabular">
                {formatManwon(row.value)}
                <span className="ml-1.5 text-[16px] font-semibold text-ink-soft">{share}%</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-line-soft" aria-hidden>
              <div
                className="h-3 rounded-full bg-brand"
                style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
