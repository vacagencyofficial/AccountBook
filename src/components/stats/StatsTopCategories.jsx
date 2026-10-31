import { formatCurrency } from '../../utils/format'
import { formatManwon } from '../../utils/labels'

/** 기간 동안 많이 쓴 곳 */
export default function StatsTopCategories({ span, spanSummary }) {
  return (
    <>
      {spanSummary.byCategory.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 text-[19px] font-extrabold">{span}달 동안 많이 쓴 곳</h2>
          <ul className="space-y-3">
            {spanSummary.byCategory.slice(0, 6).map((row) => {
              const share = spanSummary.expense ? Math.round((row.amount / spanSummary.expense) * 100) : 0
              return (
                <li key={row.name} aria-label={`${row.name} ${formatCurrency(row.amount)}, ${share}%`}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-[17px] font-bold">{row.name}</span>
                    <span className="shrink-0 text-[17px] font-bold tabular">
                      {formatManwon(row.amount)}
                      <span className="ml-1.5 text-[16px] font-semibold text-ink-soft">{share}%</span>
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-line-soft" aria-hidden>
                    <div className="h-3 rounded-full bg-brand" style={{ width: `${Math.max(2, share)}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}
