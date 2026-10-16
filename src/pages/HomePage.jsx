import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ItemRow from '../components/ItemRow'
import { db } from '../db'
import { attachShopAndPhoto } from '../db/queries'
import { useLiveQuery } from '../hooks/useLiveQuery'
import {
  formatCurrency,
  formatMonthLabel,
  formatTodayHeader,
  getToday,
} from '../utils/format'
import {
  groupByCategory,
  groupByShop,
  itemsForMonth,
  itemsForToday,
  summarizeItems,
} from '../utils/analytics'

export default function HomePage() {
  const today = getToday()

  const { data: items, isLoading } = useLiveQuery(async () => {
    const rows = await db.items.orderBy('createdAt').reverse().toArray()
    return attachShopAndPhoto(rows)
  }, [])

  const todayItems = itemsForToday(items ?? [], today)
  const monthItems = itemsForMonth(items ?? [])
  const todaySummary = summarizeItems(todayItems)
  const monthSummary = summarizeItems(monthItems)
  const shopRanks = groupByShop(monthItems).slice(0, 5)
  const categoryRanks = groupByCategory(monthItems)

  return (
    <div>
      <PageHeader brand subtitle={formatTodayHeader()} />

      <section className="border-b border-line px-4 py-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] text-ink-muted">오늘</p>
            <p className="mt-1 text-[28px] font-bold leading-none tracking-[-0.04em] tabular text-ink">
              {formatCurrency(todaySummary.total)}
            </p>
            <p className="mt-1.5 text-[12px] text-ink-muted">
              {todaySummary.count}건 · {todaySummary.qty}장
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-ink-muted">{formatMonthLabel()}</p>
            <p className="mt-1 text-[18px] font-bold tabular tracking-[-0.02em] text-ink">
              {formatCurrency(monthSummary.total)}
            </p>
            <p className="mt-1 text-[12px] text-ink-muted">
              {monthSummary.count}건 · {monthSummary.qty}장
            </p>
          </div>
        </div>

        <Link
          to="/capture"
          className="mt-4 flex h-11 w-full items-center justify-center bg-ink text-[14px] font-semibold text-white active:opacity-80"
        >
          사진 찍고 기록하기
        </Link>
      </section>

      {shopRanks.length > 0 && (
        <section className="border-b border-line px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-ink">이번 달 가게</h2>
            <Link to="/history" className="text-[12px] font-medium text-ink-muted">
              장부
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {shopRanks.map((row, index) => (
              <li key={row.shopId} className="flex items-center justify-between py-2.5 text-[13px]">
                <span className="min-w-0 truncate text-ink">
                  <span className="mr-2 tabular text-ink-muted">{index + 1}</span>
                  {row.shop?.name ?? '삭제된 가게'}
                </span>
                <span className="shrink-0 tabular font-semibold text-ink">
                  {formatCurrency(row.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {categoryRanks.length > 0 && (
        <section className="border-b border-line px-4 py-4">
          <h2 className="mb-3 text-[14px] font-bold text-ink">카테고리</h2>
          <ul className="space-y-2">
            {categoryRanks.map((row) => (
              <li key={row.category} className="flex items-center justify-between text-[13px]">
                <span className="text-ink-muted">{row.category}</span>
                <span className="tabular text-ink">
                  {row.count}건 · {formatCurrency(row.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-ink">오늘 기록</h2>
          <span className="text-[12px] text-ink-muted">{todaySummary.count}건</span>
        </div>

        {isLoading ? (
          <LoadingList />
        ) : todayItems.length === 0 ? (
          <EmptyState
            title="오늘 기록이 없습니다"
            description="위에서 사진을 찍어 가게와 금액을 남겨 주세요"
          />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {todayItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function LoadingList() {
  return (
    <div className="space-y-2 border-t border-line pt-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-16" />
      ))}
    </div>
  )
}
