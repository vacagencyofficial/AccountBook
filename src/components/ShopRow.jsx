import { Link } from 'react-router-dom'
import { shopLocation } from '../utils/format'

export default function ShopRow({ shop, itemCount }) {
  return (
    <li>
      <Link to={`/shops/${shop.id}`} className="flex items-center gap-3 py-3.5 active:bg-wash">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-wash text-[13px] font-bold text-ink">
          {shop.name.slice(0, 1)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[14px] font-semibold text-ink">{shop.name}</p>
            {itemCount != null && (
              <span className="shrink-0 text-[12px] text-ink-muted">{itemCount}건</span>
            )}
          </div>
          <p className="truncate text-[12px] text-ink-muted">
            {[shop.building, shopLocation(shop)].filter(Boolean).join(' · ')}
          </p>
          {shop.memo && <p className="mt-0.5 truncate text-[12px] text-ink-muted">{shop.memo}</p>}
        </div>

        <span className="shrink-0 text-ink-muted">›</span>
      </Link>
    </li>
  )
}
