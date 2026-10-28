import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ShopRow from '../components/ShopRow'
import { IconPlus, IconSearch } from '../components/Icons'
import { db } from '../db'
import { useLiveQuery } from '../hooks/useLiveQuery'

export default function ShopsPage() {
  const [search, setSearch] = useState('')
  const [showHidden, setShowHidden] = useState(false)

  const { data: shops, isLoading } = useLiveQuery(
    () => db.shops.orderBy('lastVisitedAt').reverse().toArray(),
    [],
  )

  const { data: itemCounts } = useLiveQuery(async () => {
    const items = await db.items.toArray()
    const counts = {}
    for (const item of items) {
      counts[item.shopId] = (counts[item.shopId] ?? 0) + 1
    }
    return counts
  }, [])

  const hiddenCount = (shops ?? []).filter((shop) => shop.hidden).length

  const filtered = useMemo(() => {
    if (!shops) return []
    const visible = shops.filter((shop) => Boolean(shop.hidden) === showHidden)
    const q = search.trim().toLowerCase()
    if (!q) return visible
    return visible.filter(
      (shop) =>
        shop.name.toLowerCase().includes(q) ||
        shop.building?.toLowerCase().includes(q) ||
        shop.memo?.toLowerCase().includes(q),
    )
  }, [shops, search, showHidden])

  return (
    <div>
      <PageHeader
        title="가게"
        subtitle="자주 가는 곳을 여기에 모아 두세요"
        tone="good"
        action={
          <Link
            to="/shops/new"
            className="tap-target inline-flex items-center gap-1 bg-good px-3 text-[15px] font-black text-white"
          >
            <IconPlus className="h-4 w-4" />
            새 가게
          </Link>
        }
      >
        <div className="relative mt-3">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="가게 이름·상가 찾기"
            className="tap-target w-full border-2 border-good/40 bg-paper pl-10 pr-3 text-[16px] font-semibold outline-none focus:border-good"
          />
        </div>
      </PageHeader>

      <section className="bg-paper px-4">
        {isLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6">
            <EmptyState
              tone="good"
              title={search ? '찾는 가게가 없어요' : '아직 가게가 없어요'}
              description={
                search
                  ? '이름을 조금 다르게 쳐 보시거나, 「새 가게」로 추가해 주세요.'
                  : '오른쪽 위 「새 가게」를 누르거나, 사진 찍을 때 만들어도 됩니다.'
              }
            />
          </div>
        ) : (
          <ul className="divide-y-2 divide-line">
            {filtered.map((shop) => (
              <ShopRow key={shop.id} shop={shop} itemCount={itemCounts?.[shop.id] ?? 0} />
            ))}
          </ul>
        )}
        {(hiddenCount > 0 || showHidden) && (
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="tap-target my-4 w-full border-2 border-line bg-paper text-[16px] font-bold text-ink-muted"
          >
            {showHidden ? '보이는 가게로 돌아가기' : `숨긴 가게 ${hiddenCount}곳 보기`}
          </button>
        )}
      </section>
    </div>
  )
}
