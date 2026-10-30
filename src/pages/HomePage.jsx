import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ItemRow from '../components/ItemRow'
import EntryRow from '../components/EntryRow'
import Onboarding from '../components/Onboarding'
import { needsOnboarding } from '../lib/onboarding'
import { IconCamera, IconSearch } from '../components/Icons'
import BackupReminder from '../components/BackupReminder'
import StorageWarning from '../components/StorageWarning'
import { categoryBudgetStatus, getMonthBudget } from '../lib/budget'
import { db } from '../db'
import { attachShopAndPhoto } from '../db/queries'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { useToday } from '../hooks/useToday'
import { formatCurrency, itemTotal } from '../utils/format'
import { formatDateString } from '../utils/dateRange'
import { isPurchased, itemsForToday, summarizeCredit, summarizeItems } from '../utils/analytics'
import { formatManwon, formatWonShort } from '../utils/labels'
import { ledgerDate, monthKeyOf, summarizeLedger } from '../utils/ledger'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatHomeDate(date = new Date()) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`
}

/** 이번 주(일~토) 날짜별 나간 돈(사입 + 그 밖의 지출)과, 지난주 같은 요일까지의 합계 */
function weekStats(items, entries) {
  const now = new Date()
  const todayIndex = now.getDay()
  const byDate = {}
  for (const item of items) {
    if (!isPurchased(item)) continue
    const date = ledgerDate(item)
    byDate[date] = (byDate[date] ?? 0) + itemTotal(item)
  }
  for (const entry of entries) {
    if (entry.type === 'income') continue
    byDate[entry.date] = (byDate[entry.date] ?? 0) + (Number(entry.amount) || 0)
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
  const [showOnboarding, setShowOnboarding] = useState(needsOnboarding)

  const { data: items, isLoading } = useLiveQuery(async () => {
    const rows = await db.items.orderBy('createdAt').reverse().toArray()
    return attachShopAndPhoto(rows)
  }, [])

  const { data: entries } = useLiveQuery(() => db.entries.orderBy('createdAt').reverse().toArray(), [])

  const todayItems = itemsForToday(items ?? [], today)
  const todayEntries = (entries ?? []).filter((entry) => entry.date === today)
  const todaySummary = summarizeItems(todayItems)
  // 결산은 외상을 갚은 날로 옮긴 것까지 (가계부 기준 날짜)
  const todayLedger = summarizeLedger(
    (items ?? []).filter((item) => ledgerDate(item) === today),
    todayEntries,
  )
  const monthLedger = summarizeLedger(
    (items ?? []).filter((item) => monthKeyOf(ledgerDate(item)) === monthKeyOf(today)),
    (entries ?? []).filter((entry) => monthKeyOf(entry.date) === monthKeyOf(today)),
  )
  const week = weekStats(items ?? [], entries ?? [])
  const monthNumber = new Date().getMonth() + 1
  const [budget] = useState(getMonthBudget)
  const credit = summarizeCredit(items ?? [])
  const creditShops = new Set(credit.items.map((item) => item.shopId)).size
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  function handleSearch(event) {
    event.preventDefault()
    const query = search.trim()
    if (query) navigate('/history', { state: { query } })
  }

  return (
    <div>
      {/* 처음 쓰는 분(기록이 하나도 없을 때)만 안내 */}
      {showOnboarding && !isLoading && (items ?? []).length === 0 && (
        <Onboarding onDone={() => setShowOnboarding(false)} />
      )}
      <PageHeader brand subtitle={formatHomeDate()} />

      <section className="px-4 pt-2">
        <form onSubmit={handleSearch} role="search" className="mb-3 flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="상품·가게 찾기"
            enterKeyHint="search"
            className="field min-w-0 flex-1"
            aria-label="상품·가게 찾기"
          />
          <button type="submit" className="btn btn-outline shrink-0 px-3.5" aria-label="찾기">
            <IconSearch className="h-6 w-6" />
          </button>
        </form>
        <div className="hero px-5 pb-4 pt-4">
          <p className="text-[18px] font-semibold opacity-85">오늘 쓴 돈</p>
          <p className="mt-0.5 text-[clamp(30px,10vw,40px)] font-extrabold leading-tight tracking-[-0.03em] tabular [overflow-wrap:anywhere]">
            {isLoading ? '…' : formatCurrency(todayLedger.expense)}
          </p>
          {!isLoading && (
            <p className="mt-1 text-[16px] font-semibold opacity-80">
              {todayLedger.otherExpense > 0
                ? `사입 ${formatWonShort(todayLedger.purchase)} · 그 밖에 ${formatWonShort(todayLedger.otherExpense)}`
                : todaySummary.count
                  ? `${todaySummary.count}건 · ${todaySummary.qty}개 샀어요`
                  : '아직 산 것이 없어요'}
              {todaySummary.pendingCount > 0 && ` · 고민 중 ${todaySummary.pendingCount}건 제외`}
            </p>
          )}
          <Link
            to="/history"
            className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-[17px]"
          >
            <span>{monthNumber}월 전체</span>
            <b className="text-[21px] font-extrabold tabular">
              {isLoading ? '…' : formatCurrency(monthLedger.expense)} ›
            </b>
          </Link>
          {!isLoading && monthLedger.income > 0 && (
            <Link to="/stats" className="mt-1.5 flex items-center justify-between text-[16px] font-semibold">
              <span className="opacity-85">들어온 돈 {formatWonShort(monthLedger.income)}</span>
              <b className={monthLedger.balance < 0 ? 'text-[#fdba74]' : ''}>
                남은 돈 {monthLedger.balance < 0 ? '−' : ''}
                {formatWonShort(Math.abs(monthLedger.balance))}
              </b>
            </Link>
          )}
          {budget > 0 && !isLoading && <BudgetBar spent={monthLedger.expense} budget={budget} />}
        </div>

        <Link to="/capture" className="btn btn-accent mt-4 w-full text-[21px]" style={{ minHeight: '4rem' }}>
          <IconCamera className="h-7 w-7" />
          상품 입력
        </Link>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <Link to="/money/new?type=expense" className="btn btn-outline text-[18px]">
            − 돈 쓴 것
          </Link>
          <Link to="/money/new?type=income" className="btn btn-outline text-[18px]">
            + 돈 들어온 것
          </Link>
        </div>
        <Link
          to="/stats"
          className="mt-2.5 flex min-h-[3rem] items-center justify-center text-[17px] font-bold text-brand"
        >
          달마다 비교·통계 보기 ›
        </Link>

        {credit.count > 0 && (
          <Link to="/shops" className="card mt-4 flex items-center justify-between gap-3 px-4 py-3.5">
            <div>
              <p className="text-[16px] font-bold text-ink-muted">안 갚은 외상</p>
              <p className="text-[22px] font-extrabold text-warn tabular">{formatCurrency(credit.total)}</p>
            </div>
            <span className="text-right text-[16px] font-semibold text-ink-soft">
              가게 {creditShops}곳 · {credit.count}건 ›
              {credit.oldCount > 0 && (
                <span className="block font-bold text-red-700">한 달 넘은 것 {credit.oldCount}건</span>
              )}
            </span>
          </Link>
        )}

        {!isLoading && <CategoryBudgetAlert byCategory={monthLedger.byCategory} />}
        <StorageWarning />
        {!isLoading && <BackupReminder items={items ?? []} />}

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
                style={{
                  height: `${Math.max(4, (day.total / week.max) * 100)}%`,
                  opacity: day.isFuture ? 0.5 : 1,
                }}
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
          <h2 className="text-[20px] font-extrabold">
            오늘 적은 것 {todayItems.length + todayEntries.length}건
          </h2>
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
        ) : todayItems.length + todayEntries.length === 0 ? (
          <EmptyState
            icon="camera"
            title="아직 오늘 기록이 없어요"
            description="「상품 입력」을 눌러 입력하면 여기에 쌓여요."
          />
        ) : (
          <ul className="space-y-2.5">
            {todayItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
            {todayEntries.map((entry) => (
              <EntryRow key={`entry-${entry.id}`} entry={entry} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/** 이번 달 예산 중 얼마나 썼는지 */
function BudgetBar({ spent, budget }) {
  const ratio = spent / budget
  const pct = Math.round(ratio * 100)
  const over = ratio > 1
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-[16px] font-semibold">
        <span className="opacity-85">예산 {formatWonShort(budget)}</span>
        <b className={over ? 'text-[#fdba74]' : ''}>
          {over ? `${formatWonShort(spent - budget)} 넘었어요` : `${pct}% 썼어요`}
        </b>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
        <div
          className={`h-full rounded-full ${over ? 'bg-[#fb923c]' : 'bg-white'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  )
}

/** 분류별 예산을 넘은 것이 있으면 알림 (통계로) */
function CategoryBudgetAlert({ byCategory }) {
  const over = categoryBudgetStatus(byCategory).filter((row) => row.over > 0)
  if (over.length === 0) return null
  return (
    <Link to="/stats" className="card mt-4 flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[16px] font-bold text-ink-muted">이번 달 예산을 넘었어요</p>
        <p className="truncate text-[18px] font-extrabold text-red-700">
          {over
            .slice(0, 2)
            .map((row) => `${row.name} ${formatWonShort(row.over)}`)
            .join(' · ')}
          {over.length > 2 ? ` 외 ${over.length - 2}개` : ''}
        </p>
      </div>
      <span className="shrink-0 text-[16px] font-semibold text-ink-soft">보기 ›</span>
    </Link>
  )
}
