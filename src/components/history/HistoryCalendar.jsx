import ItemRow from '../ItemRow'
import EntryRow from '../EntryRow'
import { isPurchased, summarizeItems } from '../../utils/analytics'
import { formatDateString } from '../../utils/dateRange'
import { formatCurrency, itemTotal } from '../../utils/format'
import { formatManwon } from '../../utils/labels'
import { summarizeLedger } from '../../utils/ledger'
import { WEEKDAYS, dayHeading } from './dayHeading'

/** 장부 달력: 날짜마다 나간 돈(없으면 들어온 돈), 고른 날의 기록 목록 */
export default function HistoryCalendar({
  month,
  today,
  selectedDate,
  onSelectDate,
  isThisMonth,
  data: { byDate, ledgerByDate, entriesByDate, rowsOf },
}) {
  // 달력 칸: 앞쪽 빈칸 + 1일~말일
  const firstWeekday = new Date(month.year, month.month, 1).getDay()
  const lastDay = new Date(month.year, month.month + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => formatDateString(new Date(month.year, month.month, i + 1))),
  ]
  const selectedItems = selectedDate ? rowsOf(selectedDate) : []
  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] ?? []) : []
  const selectedSummary = summarizeItems(selectedItems)
  const selectedLedger = summarizeLedger(
    selectedDate ? (ledgerByDate[selectedDate] ?? []) : [],
    selectedEntries,
  )
  const selectedCount = selectedItems.length + selectedEntries.length

  return (
    <>
      <div className="card mt-3 px-2 pb-2 pt-3">
        <div className="grid grid-cols-7 pb-1 text-center text-[16px] font-bold text-ink-soft">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={i === 0 ? 'text-red-600' : ''}>
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((date, index) => {
            if (!date) return <span key={`blank-${index}`} />
            const dayItems = byDate[date] ?? []
            const dayEntries = entriesByDate[date] ?? []
            const total =
              (ledgerByDate[date] ?? []).filter(isPurchased).reduce((sum, item) => sum + itemTotal(item), 0) +
              dayEntries
                .filter((entry) => entry.type !== 'income')
                .reduce((sum, entry) => sum + entry.amount, 0)
            const income = dayEntries
              .filter((entry) => entry.type === 'income')
              .reduce((sum, entry) => sum + entry.amount, 0)
            const isSelected = date === selectedDate
            const isFuture = date > today
            const isSunday = index % 7 === 0
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelectDate(date)}
                className={[
                  'flex min-h-[3.35rem] flex-col items-center justify-start rounded-[10px] pt-1',
                  isSelected ? 'bg-brand text-white' : '',
                  !isSelected && date === today ? 'ring-2 ring-accent ring-inset' : '',
                ].join(' ')}
                aria-label={`${dayHeading(date)}${total ? ` ${formatCurrency(total)}` : ''}`}
                aria-pressed={isSelected}
              >
                <span
                  className={`text-[17px] font-bold ${
                    isSelected ? '' : isFuture ? 'text-line' : isSunday ? 'text-red-600' : 'text-ink'
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                {total > 0 && (
                  <span
                    className={`text-[16px] font-extrabold tracking-[-0.03em] ${isSelected ? 'text-white' : 'text-accent-dark'}`}
                  >
                    {formatManwon(total)}
                  </span>
                )}
                {total === 0 && income > 0 && (
                  <span
                    className={`text-[16px] font-extrabold tracking-[-0.03em] ${isSelected ? 'text-white' : 'text-good'}`}
                  >
                    +{formatManwon(income)}
                  </span>
                )}
                {total === 0 && income === 0 && dayItems.length > 0 && (
                  <span
                    className={`mt-1 h-2 w-2 rounded-full ${isSelected ? 'bg-white' : 'bg-warn'}`}
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between px-0.5">
            <div>
              <h2 className="text-[20px] font-extrabold">{dayHeading(selectedDate)}</h2>
              <p className="text-[16px] font-semibold text-ink-soft">
                {selectedCount === 0
                  ? '이날은 기록이 없어요'
                  : selectedEntries.length
                    ? `${selectedCount}건`
                    : `${selectedItems.length}건 중 ${selectedSummary.count}건 샀어요`}
              </p>
            </div>
            {selectedCount > 0 && (
              <b className="text-[21px] font-extrabold text-brand tabular">
                {formatCurrency(selectedLedger.expense)}
              </b>
            )}
          </div>
          {selectedCount > 0 && (
            <ul className="space-y-2.5">
              {selectedItems.map((item) => (
                <ItemRow key={item.id} item={item} showDate={item.date !== selectedDate} />
              ))}
              {selectedEntries.map((entry) => (
                <EntryRow key={`entry-${entry.id}`} entry={entry} />
              ))}
            </ul>
          )}
        </section>
      )}
      {!selectedDate && !isThisMonth && (
        <p className="mt-4 text-center text-[16px] font-semibold text-ink-soft">
          날짜를 누르면 그날 기록이 나와요
        </p>
      )}
    </>
  )
}
