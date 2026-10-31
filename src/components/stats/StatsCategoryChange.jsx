import { formatManwon } from '../../utils/labels'
import { monthLabel } from './statsHelpers'
import Signed from './Signed'

/** 「어디서 늘고 줄었나요?」 분류별로 지난달과 비교 */
export default function StatsCategoryChange({ prevKey, baseKey, compare }) {
  return (
    <>
      {compare.length > 0 && (
        <section className="card p-4">
          <h2 className="text-[19px] font-extrabold">어디서 늘고 줄었나요?</h2>
          <p className="mb-2 text-[16px] font-semibold text-ink-soft">
            {monthLabel(baseKey)}과 {monthLabel(prevKey)}의 나간 돈
          </p>
          <ul className="divide-y divide-line-soft">
            {compare.map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-bold">{row.name}</p>
                  <p className="text-[16px] font-semibold text-ink-soft tabular">
                    {formatManwon(row.before)} → {formatManwon(row.now)}
                  </p>
                </div>
                <p className="shrink-0 text-right text-[17px] tabular">
                  <Signed value={row.diff} />
                  {row.rate != null && row.diff !== 0 && (
                    <span className="block text-[16px] font-semibold text-ink-soft">
                      {row.rate > 0 ? '+' : ''}
                      {row.rate}%
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
