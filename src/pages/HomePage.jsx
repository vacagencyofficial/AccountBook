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

function countLabel(count, qty) {
  if (!count) return '아직 기록이 없어요'
  return `기록 ${count}개 · 옷 ${qty}장`
}

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
      <PageHeader brand subtitle={`${formatTodayHeader()} · 오늘도 수고하세요`} tone="brand">
        <p className="mt-3 bg-paper/80 px-3 py-2 text-[14px] font-bold leading-snug text-ink-muted">
          <span className="text-accent">주황</span>은 사진 · <span className="text-good">초록</span>은 가게 ·{' '}
          <span className="text-ledger">보라</span>는 장부입니다
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="tone-rail-brand border-2 border-brand/40 bg-paper p-3">
            <p className="inline-flex items-center gap-1 text-[14px] font-black text-brand">
              <IconCalendar className="h-4 w-4" />
              오늘 쓴 돈
            </p>
            <p className="mt-2 text-[26px] font-black tabular leading-none text-ink">
              {formatCurrency(todaySummary.total)}
            </p>
            <p className="mt-2 text-[14px] font-bold text-ink-muted">{countLabel(todaySummary.count, todaySummary.qty)}</p>
          </div>
          <div className="tone-rail-good border-2 border-good/40 bg-paper p-3">
            <p className="inline-flex items-center gap-1 text-[14px] font-black text-good">
              <IconMoney className="h-4 w-4" />
              {formatMonthLabel()} 합계
            </p>
            <p className="mt-2 text-[22px] font-black tabular leading-none text-ink">
              {formatCurrency(monthSummary.total)}
            </p>
            <p className="mt-2 text-[14px] font-bold text-ink-muted">{countLabel(monthSummary.count, monthSummary.qty)}</p>
          </div>
        </div>

        <Link
          to="/capture"
          className="tap-target mt-4 flex w-full items-center justify-center gap-2 bg-accent py-4 text-[19px] font-black text-white shadow-md shadow-accent/30 active:bg-accent-dark"
        >
          <IconCamera className="h-7 w-7" />
          사진 찍고 적기
        </Link>
        <p className="mt-2 text-center text-[13px] font-bold text-ink-muted">가장 자주 쓰는 버튼이에요</p>
      </PageHeader>

      {shopRanks.length > 0 && (
        <section className="tone-rail-good border-b-2 border-line bg-paper px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-[18px] font-black text-good">
              <span className="flex h-9 w-9 items-center justify-center bg-good-soft">
                <IconShop className="h-5 w-5" />
              </span>
              이번 달 많이 간 가게
            </h2>
            <Link to="/history" className="text-[15px] font-black text-ledger">
              장부 보기 ›
            </Link>
          </div>
          <ul className="divide-y-2 divide-line">
            {shopRanks.map((row, index) => {
              const content = (
                <>
                  <span className="min-w-0 truncate font-bold text-ink">
                    <span className="mr-2 inline-flex h-8 w-8 items-center justify-center bg-good-soft text-[15px] font-black text-good">
                      {index + 1}
                    </span>
                    {row.shop?.name ?? '없는 가게'}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 tabular text-[16px] font-black text-ink">
                    {formatCurrency(row.total)}
                    <span className="text-[20px] font-bold text-good" aria-hidden>
                      ›
                    </span>
                  </span>
                </>
              )

              if (!row.shopId) {
                return (
                  <li key={`gone-${index}`} className="flex items-center justify-between py-3 text-[16px]">
                    {content}
                  </li>
                )
              }

              return (
                <li key={row.shopId}>
                  <Link
                    to={`/shops/${row.shopId}`}
                    className="tap-target flex items-center justify-between py-3 text-[16px] active:bg-good-soft/40"
                  >
                    {content}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {categoryRanks.length > 0 && (
        <section className="border-b-2 border-line bg-paper px-4 py-4">
          <h2 className="mb-3 text-[18px] font-black text-ink">옷 종류별</h2>
          <div className="flex flex-wrap gap-2">
            {categoryRanks.map((row) => (
              <span
                key={row.category}
                className=" border-2 border-brand/25 bg-brand-soft px-3 py-2 text-[15px] font-bold text-brand-dark"
              >
                {row.category} · {row.count}개 · {formatCurrency(row.total)}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="bg-paper px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-black text-ink">오늘 적으신 것</h2>
          <span className=" bg-brand-soft px-3 py-1 text-[14px] font-black text-brand">
            {todaySummary.count}개
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : todayItems.length === 0 ? (
          <EmptyState
            tone="accent"
            icon="camera"
            title="아직 오늘 기록이 없어요"
            description="주황 버튼을 눌러 사진을 남기면 여기에 쌓입니다. 천천히 하셔도 됩니다."
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
