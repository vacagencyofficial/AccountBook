import { Link } from 'react-router-dom'
import PhotoThumbnail from './PhotoThumbnail'
import StatusBadge from './StatusBadge'
import { isUnpaidCredit } from '../utils/analytics'
import { formatCurrency, formatDateLabel, itemTotal } from '../utils/format'

export default function ItemRow({ item, showDate = false }) {
  const total = itemTotal(item)
  const sub = [item.shop?.name ?? '가게 정보 없음', item.shop?.building].filter(Boolean).join(' · ')

  return (
    <li>
      <Link to={`/items/${item.id}`} className="card flex items-center gap-3.5 px-3.5 py-3 active:bg-wash">
        <PhotoThumbnail blob={item.photo?.blob} alt={item.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[19px] font-bold text-ink">
            {item.starred ? (
              <span className="mr-1 text-[#f59e0b]" aria-label="별표">
                ★
              </span>
            ) : null}
            {item.name || '이름 없는 물건'}
          </p>
          <p className="truncate text-[16px] font-semibold text-ink-soft">{sub}</p>
          <p className="mt-0.5 truncate text-[16px] font-semibold text-ink-soft tabular">
            {showDate && `${formatDateLabel(item.date)} · `}
            {formatCurrency(item.price)} × {item.qty}개
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <b className="text-[20px] font-extrabold text-ink tabular">{formatCurrency(total)}</b>
          <StatusBadge status={item.status} />
          {isUnpaidCredit(item) && <span className="pill bg-warn-soft text-warn">외상</span>}
        </div>
      </Link>
    </li>
  )
}
