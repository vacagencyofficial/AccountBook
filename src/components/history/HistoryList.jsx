import ItemRow from '../ItemRow'
import EntryRow from '../EntryRow'
import { formatCurrency } from '../../utils/format'
import { summarizeLedger } from '../../utils/ledger'
import { dayHeading } from './dayHeading'

/** 장부 목록: 날짜마다 (최근 날짜부터) 상품·가계부 기록과 그날 나간 돈 */
export default function HistoryList({ searchAll, data: { byDate, ledgerByDate, entriesByDate, rowsOf } }) {
  const sortedDates = [
    ...new Set([
      ...Object.keys(byDate),
      ...Object.keys(entriesByDate),
      ...(searchAll ? [] : Object.keys(ledgerByDate)),
    ]),
  ]
    .sort()
    .reverse()

  return (
    <div className="mt-4 space-y-5">
      {sortedDates.map((date) => {
        const dayItems = searchAll ? (byDate[date] ?? []) : rowsOf(date)
        const dayEntries = entriesByDate[date] ?? []
        const daySummary = summarizeLedger(searchAll ? dayItems : (ledgerByDate[date] ?? []), dayEntries)
        return (
          <section key={date}>
            <div className="mb-2 flex items-baseline justify-between px-0.5">
              <h2 className="text-[18px] font-extrabold">
                {dayHeading(date)} · {dayItems.length + dayEntries.length}건
              </h2>
              <b className="text-[18px] font-extrabold text-brand tabular">
                {formatCurrency(daySummary.expense)}
              </b>
            </div>
            <ul className="space-y-2.5">
              {dayItems.map((item) => (
                <ItemRow key={item.id} item={item} showDate={searchAll || item.date !== date} />
              ))}
              {dayEntries.map((entry) => (
                <EntryRow key={`entry-${entry.id}`} entry={entry} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
