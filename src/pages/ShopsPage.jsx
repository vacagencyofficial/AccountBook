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
      <PageHeader
        title="가게"
        subtitle="최근 방문순"
        action={
          <Link to="/shops/new" className="bg-ink px-3 py-2 text-[12px] font-semibold text-white">
            추가
          </Link>
        }
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="가게명, 상가, 메모"
          className="mt-3 w-full border border-line px-3 py-2.5 text-[13px] outline-none focus:border-ink"
        />
      </PageHeader>

      <section className="px-4">
        {isLoading ? (
          <LoadingList />
        ) : filtered.length === 0 ? (
          <div className="py-6">
            <EmptyState
              title={search ? '검색 결과가 없습니다' : '등록된 가게가 없습니다'}
              description={search ? '다른 키워드로 검색해 보세요' : '기록하면서 가게를 추가할 수 있습니다'}
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
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
    <div className="space-y-2 py-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton h-14" />
      ))}
    </div>
  )
}
