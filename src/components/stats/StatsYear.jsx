import { formatCurrency } from '../../utils/format'
import { formatWonShort } from '../../utils/labels'
import Signed from './Signed'

/** 한 해(1월~보는 달) 결산과 작년 같은 기간 비교, 한 달 평균, 많이 쓴 곳 */
export default function StatsYear({
  yearSummary,
  lastYearSummary,
  lastYearHasAny,
  baseYear,
  monthsInYear,
  activeMonths,
}) {
  return (
    <>
      <section className="card p-4">
        <h2 className="text-[19px] font-extrabold">{baseYear}년 한 해</h2>
        <p className="mb-2 text-[16px] font-semibold text-ink-soft">
          1월부터 {monthsInYear}월까지{lastYearHasAny ? ' · 작년 같은 기간과 비교' : ''}
        </p>
        <ul className="divide-y divide-line-soft text-[17px] font-semibold">
          {[
            ['들어온 돈', yearSummary.income, lastYearSummary.income, 'up'],
            ['나간 돈', yearSummary.expense, lastYearSummary.expense, 'down'],
            ['남은 돈', yearSummary.balance, lastYearSummary.balance, 'up'],
          ].map(([label, value, before, good]) => (
            <li key={label} className="flex items-center justify-between gap-2 py-2.5">
              <span className="text-ink-muted">{label}</span>
              <span className="text-right tabular">
                <b
                  className={`text-[19px] ${label === '남은 돈' && value < 0 ? 'text-accent-dark' : 'text-ink'}`}
                >
                  {value < 0 ? '−' : ''}
                  {formatCurrency(Math.abs(value))}
                </b>
                {lastYearHasAny && (
                  <span className="block text-[16px]">
                    <Signed value={value - before} good={good} />
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 border-t border-line-soft pt-3 text-[16px] font-semibold text-ink-muted">
          한 달에 평균{' '}
          <b className="text-ink tabular">{formatWonShort(Math.round(yearSummary.expense / activeMonths))}</b>{' '}
          나갔어요
          {yearSummary.byCategory.length > 0 && (
            <>
              {' '}
              · 가장 많이 쓴 곳{' '}
              <b className="text-ink">
                {yearSummary.byCategory
                  .slice(0, 3)
                  .map((row) => row.name)
                  .join(', ')}
              </b>
            </>
          )}
        </p>
      </section>
    </>
  )
}
