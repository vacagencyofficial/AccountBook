import PhotoThumbnail from './PhotoThumbnail'
import StatusBadge from './StatusBadge'
import { formatCurrency, formatDateLabel, itemTotal, shopLocation } from '../utils/format'

export default function ItemRow({ item, showDate = false }) {
  const total = itemTotal(item)
  const meta = [item.category || '기타', item.color, item.size].filter(Boolean).join(' · ')

  return (
    <li className="flex gap-3 py-3">
      <PhotoThumbnail blob={item.photo?.blob} alt={item.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink">{item.name || '이름 없음'}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-muted">
              {item.shop?.name ?? '삭제된 가게'}
              {shopLocation(item.shop) ? ` · ${shopLocation(item.shop)}` : ''}
            </p>
          </div>
          <p className="shrink-0 tabular text-[14px] font-bold text-ink">{formatCurrency(total)}</p>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
          {showDate && <span>{formatDateLabel(item.date)}</span>}
          <StatusBadge status={item.status} />
          <span>
            {formatCurrency(item.price)} × {item.qty}
          </span>
          {meta && <span>{meta}</span>}
        </div>

        {item.memo && <p className="mt-1 truncate text-[12px] text-ink-muted">{item.memo}</p>}
      </div>
    </li>
  )
}
