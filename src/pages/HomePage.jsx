import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ItemRow from '../components/ItemRow'
import { IconCamera } from '../components/Icons'
import { db } from '../db'
import { attachShopAndPhoto } from '../db/queries'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { useToday } from '../hooks/useToday'
import { formatCurrency, itemTotal } from '../utils/format'
import { formatDateString } from '../utils/dateRange'
import { isPurchased, itemsForMonth, itemsForToday, summarizeItems } from '../utils/analytics'
import { formatManwon } from '../utils/labels'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatHomeDate(date = new Date()) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`
}

/** 이번 주(일~토) 날짜별 산 금액과, 지난주 같은 요일까지의 합계 */
function weekStats(items) {
  const now = new Date()
  const todayIndex = now.getDay()
  const byDate = {}
  for (const item of items) {
    if (!isPurchased(item)) continue
    byDate[item.date] = (byDate[item.date] ?? 0) + itemTotal(item)
  }
  const days = []
  let thisWeek = 0
  let lastWeek = 0
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now)
    d.setDate(now.getDate() - todayIndex + i)
    const total = byDate[formatDateString(d)] ?? 0
    days.push({ label: WEEKDAYS[i], total, isToday: i === todayIndex, isFuture: i > todayIndex })
    if (i <= todayIndex) {
      thisWeek += total
      const prev = new Date(d)
      prev.setDate(d.getDate() - 7)
      lastWeek += byDate[formatDateString(prev)] ?? 0
    }
  }
  return { days, thisWeek, lastWeek, max: Math.max(...days.map((d) => d.total), 1) }
}

function WeekCompare({ thisWeek, lastWeek }) {
  if (!lastWeek && !thisWeek) return <span>이번 주 기록이 아직 없어요</span>
  if (!lastWeek) return <span>지난주 같은 때는 기록이 없었어요</span>
  const diff = thisWeek - lastWeek
  if (diff === 0) return <span>지난주와 똑같이 썼어요</span>
  return (
    <span>
      지난주보다{' '}
      <b className={diff < 0 ? 'text-good' : 'text-accent-dark'}>
        {formatManwon(Math.abs(diff))} {diff < 0 ? '덜' : '더'}
      </b>{' '}
      썼어요
    </span>
  )
}

export default function HomePage() {
  const today = useToday()

  const { data: items, isLoading } = useLiveQuery(async () => {
    const rows = await db.items.orderBy('createdAt').reverse().toArray()
    return attachShopAndPhoto(rows)
  }, [])

  const todayItems = itemsForToday(items ?? [], today)
  const todaySummary = summarizeItems(todayItems)
  const monthSummary = summarizeItems(itemsForMonth(items ?? []))
  const week = weekStats(items ?? [])
  const monthNumber = new Date().getMonth() + 1

  return (
    <div>
      <PageHeader brand subtitle={formatHomeDate()} />

      <section className="px-4 pt-2">
        <div className="hero receipt px-5 pb-4 pt-4">
          <div className="hero-deco" aria-hidden />
          <p className="text-[18px] font-semibold opacity-85">오늘 쓴 돈</p>
          <p className="mt-0.5 text-[clamp(30px,10vw,40px)] font-extrabold leading-tight tracking-[-0.03em] tabular [overflow-wrap:anywhere]">
            {isLoading ? '…' : formatCurrency(todaySummary.total)}
          </p>
          {!isLoading && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="hero-pill">
                {todaySummary.count ? `${todaySummary.count}건 · ${todaySummary.qty}개 샀어요` : '아직 산 것이 없어요'}
              </span>
              {todaySummary.pendingCount > 0 && (
                <span className="hero-pill hero-pill-warn">고민 중 {todaySummary.pendingCount}건은 뺐어요</span>
              )}
            </div>
          )}
          <Link
            to="/history"
            className="mt-4 flex items-center justify-between border-t border-dashed border-white/30 pt-3 text-[17px]"
          >
            <span>{monthNumber}월 전체</span>
            <b className="text-[21px] font-extrabold tabular">
              {isLoading ? '…' : formatCurrency(monthSummary.total)} ›
            </b>
          </Link>
        </div>

        <Link to="/capture" className="btn btn-accent mt-4 w-full text-[21px]" style={{ minHeight: '4rem' }}>
          <IconCamera className="h-7 w-7" />
          물건 적기
        </Link>

        <div className="card mt-4 px-4 pb-3 pt-3.5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="text-[19px] font-extrabold">이번 주</h2>
            <p className="text-[16px] font-semibold text-ink-soft">
              <WeekCompare thisWeek={week.thisWeek} lastWeek={week.lastWeek} />
            </p>
          </div>
          <div className="grid h-16 grid-cols-7 items-end gap-2" aria-hidden>
            {week.days.map((day) => (
              <span
                key={day.label}
                className={`block rounded-t-[4px] ${day.isToday ? 'bg-accent' : 'bg-line'}`}
                style={{ height: `${Math.max(4, (day.total / week.max) * 100)}%`, opacity: day.isFuture ? 0.5 : 1 }}
              />
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-2 text-center text-[16px] font-semibold text-ink-soft">
            {week.days.map((day) => (
              <span key={day.label} className={day.isToday ? 'font-extrabold text-accent-dark' : ''}>
                {day.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pt-5">
        <div className="mb-3 flex items-baseline justify-between px-0.5">
          <h2 className="text-[20px] font-extrabold">오늘 적은 것 {todayItems.length}건</h2>
          <Link to="/history" className="text-[17px] font-bold text-brand">
            모두 보기 ›
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : todayItems.length === 0 ? (
          <EmptyState
            icon="camera"
            title="아직 오늘 기록이 없어요"
            description="「물건 적기」를 눌러 적으면 여기에 쌓여요."
          />
        ) : (
          <ul className="space-y-2.5">
            {todayItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
