import { formatWonShort } from '../../utils/labels'
import { monthLabel } from './statsHelpers'
import Signed from './Signed'

/** 나간 돈·들어온 돈을 지난달·작년 같은 달과 비교 */
export default function StatsCompare({ thisMonth, lastMonth, lastYear, lastYearKey, prevKey, lastYearHas }) {
  return (
    <>
      <section className="card p-4">
        <h2 className="mb-2 text-[19px] font-extrabold">나간 돈 비교</h2>
        <ul className="divide-y divide-line-soft text-[17px] font-semibold">
          <li className="flex items-center justify-between gap-2 py-2.5">
            <span className="text-ink-muted">
              지난달({monthLabel(prevKey)}) {formatWonShort(lastMonth.expense)}보다
            </span>
            <Signed value={thisMonth.expense - lastMonth.expense} />
          </li>
          {lastYearHas && (
            <li className="flex items-center justify-between gap-2 py-2.5">
              <span className="text-ink-muted">
                작년 {monthLabel(lastYearKey)} {formatWonShort(lastYear.expense)}보다
              </span>
              <Signed value={thisMonth.expense - lastYear.expense} />
            </li>
          )}
          <li className="flex items-center justify-between gap-2 py-2.5">
            <span className="text-ink-muted">들어온 돈은 지난달보다</span>
            <Signed value={thisMonth.income - lastMonth.income} good="up" />
          </li>
        </ul>
      </section>
    </>
  )
}
