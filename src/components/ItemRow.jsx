import PhotoThumbnail from './PhotoThumbnail'
import StatusBadge from './StatusBadge'
import { categoryTone } from '../utils/categories'
import { formatCurrency, formatDateLabel, itemTotal, shopLocation } from '../utils/format'

export default function ItemRow({ item, showDate = false }) {
  const total = itemTotal(item)
  const meta = [item.color, item.size].filter(Boolean).join(' · ')

  return (
    <li className="flex gap-3 px-3.5 py-3">
      <PhotoThumbnail blob={item.photo?.blob} alt={item.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{item.name || '이름 없음'}</p>
            <p className="mt-0.5 truncate text-xs text-ink-muted">
              {item.shop?.name ?? '삭제된 가게'}
              {shopLocation(item.shop) ? ` · ${shopLocation(item.shop)}` : ''}
            </p>
          </div>
          <p className="shrink-0 tabular text-sm font-bold text-ink">{formatCurrency(total)}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {showDate && (
            <span className="rounded-md bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
              {formatDateLabel(item.date)}
            </span>
          )}
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${categoryTone(item.category)}`}>
            {item.category || '기타'}
          </span>
          <StatusBadge status={item.status} />
          <span className="text-[10px] text-ink-muted">
            {formatCurrency(item.price)} × {item.qty}
          </span>
          {meta && <span className="text-[10px] text-ink-muted">{meta}</span>}
        </div>

        {item.memo && (
          <p className="mt-1.5 truncate text-xs text-ink-muted">{item.memo}</p>
        )}
      </div>
    </li>
  )
}
