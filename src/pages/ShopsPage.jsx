import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ShopRow from '../components/ShopRow'
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
      <PageHeader eyebrow="Shops" title="가게" subtitle="최근 방문순 · 상가별 관리">
        <div className="mt-3 flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="가게명, 상가, 메모 검색"
            className="min-w-0 flex-1 rounded-xl border border-line bg-raised px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <Link
            to="/shops/new"
            className="flex shrink-0 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white"
          >
            + 추가
          </Link>
        </div>
      </PageHeader>

      <section className="px-4 py-5">
        {isLoading ? (
          <LoadingList />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? '검색 결과가 없습니다' : '등록된 가게가 없습니다'}
            description={
              search ? '다른 키워드로 검색해 보세요' : '빠른 등록에서 가게를 추가하면 여기에 표시됩니다'
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-line bg-raised divide-y divide-line">
            {filtered.map((shop) => (
              <ShopRow key={shop.id} shop={shop} itemCount={itemCounts?.[shop.id] ?? 0} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton h-16 rounded-2xl" />
      ))}
    </div>
  )
}
