import { Link } from 'react-router-dom'
import { formatCurrency, formatDateLabel } from '../utils/format'

/** 가계부 한 줄: 사입 말고 다른 지출·수입 */
export default function EntryRow({ entry, showDate = false }) {
  const income = entry.type === 'income'
  const sub = [showDate && formatDateLabel(entry.date), entry.payment].filter(Boolean).join(' · ')
  return (
    <li>
      <Link to={`/money/${entry.id}`} className="card flex items-center gap-3.5 px-3.5 py-3 active:bg-wash">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] text-[16px] font-extrabold ${
            income ? 'bg-good-soft text-good' : 'bg-accent-soft text-accent-dark'
          }`}
          aria-hidden
        >
          {income ? '수입' : '지출'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[19px] font-bold text-ink">{entry.memo || entry.category}</p>
          <p className="truncate text-[16px] font-semibold text-ink-soft">
            {[entry.memo ? entry.category : '', sub].filter(Boolean).join(' · ') ||
              (income ? '들어온 돈' : '나간 돈')}
          </p>
        </div>
        <b className={`shrink-0 text-[20px] font-extrabold tabular ${income ? 'text-good' : 'text-ink'}`}>
          {income ? '+' : '−'}
          {formatCurrency(entry.amount)}
        </b>
      </Link>
    </li>
  )
}
