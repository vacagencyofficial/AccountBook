import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/format'
import { formatManwon, formatWonShort } from '../../utils/labels'
import { monthLabel } from './statsHelpers'

/** 달마다 흐름(6달·12달): 사입·그 밖·들어온 돈 막대, 누르면 그달 장부 */
export default function StatsTrend({ baseKey, keys, months, maxMonth, span, setSpan, spanSummary }) {
  return (
    <>
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[19px] font-extrabold">달마다 흐름</h2>
          <div className="flex gap-1 rounded-[10px] bg-line-soft p-1" role="radiogroup" aria-label="기간">
            {[6, 12].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={span === n}
                onClick={() => setSpan(n)}
                className={`min-h-[2.6rem] rounded-[8px] px-3 text-[16px] font-bold ${
                  span === n ? 'bg-paper text-brand shadow-[var(--shadow-card)]' : 'text-ink-soft'
                }`}
              >
                {n}달
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[16px] font-semibold text-ink-muted">
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-[3px] bg-brand" aria-hidden /> 사입
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-[3px] bg-accent" aria-hidden /> 그 밖에 나간 돈
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-[3px] bg-good" aria-hidden /> 들어온 돈
          </span>
        </div>
        <ul className="space-y-3.5">
          {[...keys].reverse().map((key) => {
            const m = months[key]
            return (
              <li key={key}>
                <Link
                  to="/history"
                  state={{ month: key }}
                  className="-mx-2 block rounded-[10px] px-2 py-1 active:bg-wash"
                  aria-label={`${monthLabel(key, true)} 나간 돈 ${formatCurrency(m.expense)}, 들어온 돈 ${formatCurrency(m.income)}. 눌러서 장부 보기`}
                >
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className={`text-[17px] font-bold ${key === baseKey ? 'text-brand' : 'text-ink'}`}>
                      {monthLabel(key, key.slice(0, 4) !== baseKey.slice(0, 4))}{' '}
                      <span className="text-ink-soft" aria-hidden>
                        ›
                      </span>
                    </span>
                    <span className="text-[16px] font-semibold text-ink-soft tabular">
                      나간 <b className="text-ink">{formatManwon(m.expense)}</b>
                      {m.income > 0 && (
                        <>
                          {' '}
                          · 남은{' '}
                          <b className={m.balance < 0 ? 'text-accent-dark' : 'text-good'}>
                            {m.balance < 0 ? '−' : ''}
                            {formatManwon(Math.abs(m.balance))}
                          </b>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-line-soft" aria-hidden>
                    <div className="h-3 bg-brand" style={{ width: `${(m.purchase / maxMonth) * 100}%` }} />
                    <div
                      className="h-3 bg-accent"
                      style={{ width: `${(m.otherExpense / maxMonth) * 100}%` }}
                    />
                  </div>
                  {m.income > 0 && (
                    <div className="mt-1 h-3 rounded-full bg-line-soft" aria-hidden>
                      <div
                        className="h-3 rounded-full bg-good"
                        style={{ width: `${(m.income / maxMonth) * 100}%` }}
                      />
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 border-t border-line-soft pt-3 text-[16px] font-semibold text-ink-muted">
          {span}달 동안 한 달에 평균{' '}
          <b className="text-ink tabular">{formatWonShort(Math.round(spanSummary.expense / span))}</b>{' '}
          나갔어요 · 달을 누르면 그달 장부가 열려요
        </p>
      </section>
    </>
  )
}
