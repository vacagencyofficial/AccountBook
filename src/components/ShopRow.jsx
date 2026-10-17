import { Link } from 'react-router-dom'
import { shopLocation } from '../utils/format'

export default function ShopRow({ shop, itemCount }) {
  return (
    <li>
      <Link to={`/shops/${shop.id}`} className="flex items-center gap-3 py-4 active:bg-wash">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-good-soft text-[18px] font-black text-good">
          {shop.name.slice(0, 1)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[17px] font-black text-ink">{shop.name}</p>
            {itemCount != null && (
              <span className="shrink-0 rounded-full bg-wash px-2 py-0.5 text-[13px] font-bold text-ink-muted">
                {itemCount}건
              </span>
            )}
          </div>
          <p className="truncate text-[14px] font-medium text-ink-muted">
            {[shop.building, shopLocation(shop)].filter(Boolean).join(' · ')}
          </p>
          {shop.memo && <p className="mt-0.5 truncate text-[13px] text-ink-muted">{shop.memo}</p>}
        </div>

        <span className="shrink-0 text-[20px] text-ink-muted">›</span>
      </Link>
    </li>
  )
}
