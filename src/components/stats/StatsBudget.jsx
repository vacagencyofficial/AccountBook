import { Link } from 'react-router-dom'
import { categoryBudgetStatus } from '../../lib/budget'
import { formatCurrency } from '../../utils/format'
import { formatManwon, formatWonShort } from '../../utils/labels'
import { monthLabel } from './statsHelpers'

/** 이 달 분류별 예산 진행 막대 (정해 둔 것이 있을 때만) */
export default function StatsBudget({ thisMonth, baseKey }) {
  return (
    <>
      {categoryBudgetStatus(thisMonth.byCategory).length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 text-[19px] font-extrabold">{monthLabel(baseKey)} 분류별 예산</h2>
          <ul className="space-y-3">
            {categoryBudgetStatus(thisMonth.byCategory).map((row) => (
              <li
                key={row.name}
                aria-label={`${row.name} 예산 ${formatCurrency(row.budget)} 중 ${formatCurrency(row.spent)}`}
              >
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[17px] font-bold">{row.name}</span>
                  <span className="shrink-0 text-[16px] font-semibold text-ink-soft tabular">
                    {formatManwon(row.spent)} / {formatManwon(row.budget)}{' '}
                    <b className={row.over > 0 ? 'text-red-700' : 'text-ink'}>
                      {row.over > 0
                        ? `${formatWonShort(row.over)} 넘었어요`
                        : `${Math.round(row.ratio * 100)}%`}
                    </b>
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-line-soft" aria-hidden>
                  <div
                    className={`h-3 rounded-full ${row.over > 0 ? 'bg-red-600' : row.ratio >= 0.8 ? 'bg-warn' : 'bg-brand'}`}
                    style={{ width: `${Math.min(100, Math.max(2, row.ratio * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <Link to="/settings" className="mt-3 block text-[16px] font-bold text-brand">
            예산 바꾸기 ›
          </Link>
        </section>
      )}
    </>
  )
}
