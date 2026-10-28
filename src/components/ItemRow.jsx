import PhotoThumbnail from './PhotoThumbnail'
import StatusBadge from './StatusBadge'
import { formatCurrency, formatDateLabel, itemTotal, shopLocation } from '../utils/format'

export default function ItemRow({ item, showDate = false }) {
  const total = itemTotal(item)
  const meta = [item.category || '기타', item.color, item.size].filter(Boolean).join(' · ')

  return (
    <li className="flex gap-3 py-3.5">
      <PhotoThumbnail blob={item.photo?.blob} alt={item.name} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-black text-ink">{item.name || '이름 없음'}</p>
            <p className="mt-0.5 truncate text-[14px] font-medium text-ink-muted">
              {item.shop?.name ?? '삭제된 가게'}
              {shopLocation(item.shop) ? ` · ${shopLocation(item.shop)}` : ''}
            </p>
          </div>
          <p className="shrink-0 tabular text-[17px] font-black text-brand">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink-muted">
          {showDate && (
            <span className=" bg-wash px-2 py-0.5">{formatDateLabel(item.date)}</span>
          )}
          <StatusBadge status={item.status} />
          <span>
            {formatCurrency(item.price)} × {item.qty}
          </span>
          {meta && <span>{meta}</span>}
        </div>

        {item.memo && <p className="mt-1.5 truncate text-[14px] text-ink-muted">{item.memo}</p>}
      </div>
    </li>
  )
}
