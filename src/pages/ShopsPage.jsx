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

  const filtered = useMemo(() => {
    if (!shops) return []
    const q = search.trim().toLowerCase()
    if (!q) return shops
    return shops.filter(
      (shop) =>
        shop.name.toLowerCase().includes(q) ||
        shop.building?.toLowerCase().includes(q) ||
        shop.memo?.toLowerCase().includes(q),
    )
  }, [shops, search])

  return (
    <div>
      <PageHeader
        title="가게"
        subtitle="최근 방문순"
        tone="good"
        action={
          <Link
            to="/shops/new"
            className="tap-target inline-flex items-center gap-1 rounded-xl bg-good px-3 text-[14px] font-black text-white"
          >
            <IconPlus className="h-4 w-4" />
            추가
          </Link>
        }
      >
        <div className="relative mt-3">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="가게명, 상가, 메모"
            className="tap-target w-full rounded-xl border-2 border-line bg-paper pl-10 pr-3 text-[16px] outline-none focus:border-good"
          />
        </div>
      </PageHeader>

      <section className="bg-paper px-4">
        {isLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6">
            <EmptyState
              title={search ? '검색 결과가 없습니다' : '등록된 가게가 없습니다'}
              description={search ? '다른 키워드로 검색해 보세요' : '기록하면서 가게를 추가할 수 있습니다'}
            />
          </div>
        ) : (
          <ul className="divide-y-2 divide-line">
            {filtered.map((shop) => (
              <ShopRow key={shop.id} shop={shop} itemCount={itemCounts?.[shop.id] ?? 0} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
