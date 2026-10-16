import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ItemRow from '../components/ItemRow'
import { db } from '../db'
import { attachShopAndPhoto } from '../db/queries'
import { useLiveQuery } from '../hooks/useLiveQuery'
import {
  formatCompactCurrency,
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
import { categoryTone } from '../utils/categories'

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
  const shopRanks = groupByShop(monthItems).slice(0, 4)
  const categoryRanks = groupByCategory(monthItems).slice(0, 4)
  const maxShopTotal = shopRanks[0]?.total || 1

  return (
    <div>
      <PageHeader
        brand
        title="오늘의 현장 장부"
        subtitle={formatTodayHeader()}
      >
        <div className="mt-5 grid grid-cols-2 gap-3">
          <MetricCard
            label="오늘"
            value={formatCompactCurrency(todaySummary.total)}
            meta={`${todaySummary.count}건 · ${todaySummary.qty}장`}
            accent
          />
          <MetricCard
            label={formatMonthLabel()}
            value={formatCompactCurrency(monthSummary.total)}
            meta={`${monthSummary.count}건 · ${monthSummary.qty}장`}
          />
        </div>
      </PageHeader>

      <section className="space-y-5 px-4 py-5">
        <div className="animate-fade-up rounded-2xl bg-ink px-4 py-4 text-white shadow-lg shadow-ink/10">
          <p className="text-xs font-medium text-white/65">빠른 기록</p>
          <p className="mt-1 font-display text-xl font-semibold tracking-tight">
            사진 찍고, 가게·금액만 적으면 끝
          </p>
          <p className="mt-1 text-sm text-white/70">
            나중에 PC에서 엑셀로 정리할 수 있어요.
          </p>
          <Link
            to="/capture"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition active:bg-accent-dark"
          >
            <CameraMini />
            지금 촬영하기
          </Link>
        </div>

        {(shopRanks.length > 0 || categoryRanks.length > 0) && (
          <div className="animate-fade-up grid gap-3">
            {shopRanks.length > 0 && (
              <div className="rounded-2xl border border-line bg-raised p-4">
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">이번 달 가게별</h2>
                    <p className="text-xs text-ink-muted">금액 기준 상위 가게</p>
                  </div>
                  <Link to="/history" className="text-xs font-semibold text-brand">
                    장부 보기
                  </Link>
                </div>
                <ul className="space-y-3">
                  {shopRanks.map((row, index) => (
                    <li key={row.shopId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">
                          <span className="mr-2 text-ink-muted">{index + 1}</span>
                          {row.shop?.name ?? '삭제된 가게'}
                        </span>
                        <span className="tabular text-sm font-semibold text-ink">
                          {formatCurrency(row.total)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-paper">
                        <div
                          className="h-full rounded-full bg-brand transition-all duration-500"
                          style={{ width: `${Math.max(8, (row.total / maxShopTotal) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {categoryRanks.length > 0 && (
              <div className="rounded-2xl border border-line bg-raised p-4">
                <h2 className="text-sm font-semibold text-ink">카테고리 분포</h2>
                <p className="mb-3 text-xs text-ink-muted">이번 달 품목 분류</p>
                <div className="flex flex-wrap gap-2">
                  {categoryRanks.map((row) => (
                    <span
                      key={row.category}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${categoryTone(row.category)}`}
                    >
                      {row.category}
                      <span className="tabular opacity-80">{formatCompactCurrency(row.total)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="animate-fade-up">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">오늘 기록</h2>
            <span className="text-xs text-ink-muted">{todaySummary.count}건</span>
          </div>

          {isLoading ? (
            <LoadingList />
          ) : todayItems.length === 0 ? (
            <EmptyState
              title="아직 오늘 기록이 없습니다"
              description="촬영 버튼으로 사진·가게·금액을 남겨 보세요"
            />
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-line bg-raised divide-y divide-line">
              {todayItems.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function MetricCard({ label, value, meta, accent }) {
  return (
    <div
      className={[
        'rounded-2xl border px-3.5 py-3',
        accent
          ? 'border-brand/20 bg-brand text-white shadow-md shadow-brand/20'
          : 'border-line bg-raised text-ink',
      ].join(' ')}
    >
      <p className={`text-[11px] font-medium ${accent ? 'text-white/75' : 'text-ink-muted'}`}>
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold tabular tracking-tight">{value}</p>
      <p className={`mt-0.5 text-[11px] ${accent ? 'text-white/70' : 'text-ink-muted'}`}>{meta}</p>
    </div>
  )
}

function LoadingList() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-[4.5rem] rounded-2xl" />
      ))}
    </div>
  )
}

function CameraMini() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.1l1.2-2h8.4l1.2 2h2.1A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z"
      />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}
