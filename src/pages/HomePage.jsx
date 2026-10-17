import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ItemRow from '../components/ItemRow'
import { IconCamera, IconCalendar, IconMoney, IconShop } from '../components/Icons'
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
      <PageHeader brand subtitle={formatTodayHeader()} tone="brand">
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-brand/30 bg-paper p-3">
            <p className="inline-flex items-center gap-1 text-[13px] font-bold text-brand">
              <IconCalendar className="h-4 w-4" />
              오늘
            </p>
            <p className="mt-1 text-[26px] font-black tabular leading-none text-ink">
              {formatCurrency(todaySummary.total)}
            </p>
            <p className="mt-2 text-[14px] font-medium text-ink-muted">
              {todaySummary.count}건 · {todaySummary.qty}장
            </p>
          </div>
          <div className="rounded-2xl border-2 border-good/30 bg-paper p-3">
            <p className="inline-flex items-center gap-1 text-[13px] font-bold text-good">
              <IconMoney className="h-4 w-4" />
              {formatMonthLabel()}
            </p>
            <p className="mt-1 text-[22px] font-black tabular leading-none text-ink">
              {formatCurrency(monthSummary.total)}
            </p>
            <p className="mt-2 text-[14px] font-medium text-ink-muted">
              {monthSummary.count}건 · {monthSummary.qty}장
            </p>
          </div>
        </div>

        <Link
          to="/capture"
          className="tap-target mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-[18px] font-black text-white shadow-md shadow-accent/25 active:bg-accent-dark"
        >
          <IconCamera className="h-6 w-6" />
          사진 찍고 기록하기
        </Link>
      </PageHeader>

      {shopRanks.length > 0 && (
        <section className="border-b-2 border-line bg-paper px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-[17px] font-black text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-good-soft text-good">
                <IconShop className="h-5 w-5" />
              </span>
              이번 달 가게
            </h2>
            <Link to="/history" className="text-[14px] font-bold text-ledger">
              장부 보기
            </Link>
          </div>
          <ul className="divide-y-2 divide-line">
            {shopRanks.map((row, index) => (
              <li key={row.shopId} className="flex items-center justify-between py-3 text-[16px]">
                <span className="min-w-0 truncate font-semibold text-ink">
                  <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-wash text-[14px] font-black text-ink-muted">
                    {index + 1}
                  </span>
                  {row.shop?.name ?? '삭제된 가게'}
                </span>
                <span className="shrink-0 tabular font-black text-ink">
                  {formatCurrency(row.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {categoryRanks.length > 0 && (
        <section className="border-b-2 border-line bg-paper px-4 py-4">
          <h2 className="mb-3 text-[17px] font-black text-ink">카테고리</h2>
          <div className="flex flex-wrap gap-2">
            {categoryRanks.map((row) => (
              <span
                key={row.category}
                className="rounded-xl bg-brand-soft px-3 py-2 text-[14px] font-bold text-brand-dark"
              >
                {row.category} · {row.count}건 · {formatCurrency(row.total)}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="bg-paper px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[17px] font-black text-ink">오늘 기록</h2>
          <span className="rounded-full bg-wash px-2.5 py-1 text-[13px] font-bold text-ink-muted">
            {todaySummary.count}건
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : todayItems.length === 0 ? (
          <EmptyState
            title="오늘 기록이 없습니다"
            description="아래 주황 카메라 버튼으로 사진을 남겨 주세요"
          />
        ) : (
          <ul className="divide-y-2 divide-line border-t-2 border-line">
            {todayItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
