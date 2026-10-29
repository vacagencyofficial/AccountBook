import { Link } from 'react-router-dom'
import { shopLocation } from '../utils/format'
import { formatWonShort } from '../utils/labels'

export default function ShopRow({ shop, itemCount, credit = 0 }) {
  return (
    <li>
      <Link to={`/shops/${shop.id}`} className="card flex items-center gap-3.5 px-3.5 py-3 active:bg-wash">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-[22px] font-extrabold text-brand">
          {shop.name.slice(0, 1)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[19px] font-bold text-ink">{shop.name}</p>
          {shopLocation(shop) && (
            <p className="truncate text-[16px] font-semibold text-ink-soft">{shopLocation(shop)}</p>
          )}
          {shop.memo && <p className="truncate text-[16px] font-medium text-ink-soft">{shop.memo}</p>}
          {credit > 0 && (
            <p className="truncate text-[16px] font-bold text-warn">외상 {formatWonShort(credit)} 남음</p>
          )}
        </div>

        {itemCount != null && (
          <span className="pill shrink-0 bg-line-soft text-ink-muted">{itemCount}건</span>
        )}
        <span className="shrink-0 text-[24px] text-ink-soft" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  )
}
