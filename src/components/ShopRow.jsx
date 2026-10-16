import { Link } from 'react-router-dom'
import { shopLocation } from '../utils/format'

export default function ShopRow({ shop, itemCount }) {
  return (
    <li>
      <Link
        to={`/shops/${shop.id}`}
        className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-paper active:bg-paper"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand">
          {shop.name.slice(0, 1)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-ink">{shop.name}</p>
            {itemCount != null && (
              <span className="shrink-0 text-xs text-ink-muted">{itemCount}건</span>
            )}
          </div>
          <p className="truncate text-xs text-ink-muted">
            {[shop.building, shopLocation(shop)].filter(Boolean).join(' · ')}
          </p>
          {shop.memo && <p className="mt-0.5 truncate text-xs text-ink-muted/80">{shop.memo}</p>}
        </div>

        <span className="shrink-0 text-ink-muted">›</span>
      </Link>
    </li>
  )
}
