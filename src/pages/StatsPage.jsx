import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SubPage from '../components/SubPage'
import EmptyState from '../components/EmptyState'
import { db } from '../db'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { formatCurrency } from '../utils/format'
import { formatManwon, formatWonShort } from '../utils/labels'
import {
  compareByCategory,
  ledgerByMonth,
  monthKeyOf,
  previousMonthKey,
  recentMonthKeys,
  summarizeLedger,
} from '../utils/ledger'

function monthLabel(key, withYear = false) {
  const [y, m] = key.split('-').map(Number)
  return withYear ? `${y}년 ${m}월` : `${m}월`
}

function sameMonthLastYear(key) {
  const [y, m] = key.split('-')
  return `${Number(y) - 1}-${m}`
}

function Signed({ value, good = 'down' }) {
  if (!value) return <span className="text-ink-soft">같아요</span>
  const up = value > 0
  const isGood = good === 'down' ? !up : up
  return (
    <b className={isGood ? 'text-good' : 'text-accent-dark'}>
      {up ? '▲' : '▼'} {formatWonShort(Math.abs(value))}
    </b>
  )
}

/** 가계부 비교·통계: 달마다 들어온 돈·나간 돈, 지난달·작년과 비교, 많이 쓴 곳 */
export default function StatsPage() {
  const now = new Date()
  const [base, setBase] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [span, setSpan] = useState(6)

  const { data, isLoading } = useLiveQuery(async () => {
    const [items, entries] = await Promise.all([db.items.toArray(), db.entries.toArray()])
    return { items, entries }
  }, [])

  const baseDate = new Date(base.year, base.month, 1)
  const isCurrentMonth = base.year === now.getFullYear() && base.month === now.getMonth()
  const keys = recentMonthKeys(span, baseDate)
  const baseKey = keys[keys.length - 1]
  const prevKey = previousMonthKey(baseKey)
  const lastYearKey = sameMonthLastYear(baseKey)

  const stats = useMemo(() => {
    if (!data) return null
    const months = ledgerByMonth(data.items, data.entries, [...new Set([...keys, prevKey, lastYearKey])])
    const inSpan = (date) => keys.includes(monthKeyOf(date))
    const spanSummary = summarizeLedger(
      data.items.filter((item) => inSpan(item.date)),
      data.entries.filter((entry) => inSpan(entry.date)),
    )
    return { months, spanSummary }
    // keys는 base·span으로 정해짐
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, baseKey, span])

  function moveMonth(diff) {
    const d = new Date(base.year, base.month + diff, 1)
    setBase({ year: d.getFullYear(), month: d.getMonth() })
  }

  if (isLoading || !stats) {
    return (
      <SubPage title="비교·통계" backTo="/history">
        <div className="skeleton h-72" />
      </SubPage>
    )
  }

  const { months, spanSummary } = stats
  const thisMonth = months[baseKey]
  const lastMonth = months[prevKey]
  const lastYear = months[lastYearKey]
  const hasAny = data.items.length + data.entries.length > 0
  const compare = compareByCategory(thisMonth, lastMonth).filter((row) => row.now || row.before)
  const maxMonth = Math.max(...keys.map((key) => Math.max(months[key].expense, months[key].income)), 1)
  const lastYearHas = lastYear.expense + lastYear.income > 0

  return (
    <SubPage title="비교·통계" subtitle="들어온 돈·나간 돈을 달마다 비교해요" backTo="/history">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="btn btn-outline px-0 text-[30px] leading-none"
          style={{ width: '3.5rem' }}
          aria-label="지난달"
        >
          ‹
        </button>
        <p className="text-[22px] font-extrabold">{monthLabel(baseKey, true)}</p>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          disabled={isCurrentMonth}
          className="btn btn-outline px-0 text-[30px] leading-none disabled:opacity-30"
          style={{ width: '3.5rem' }}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      {!hasAny ? (
        <EmptyState
          title="아직 기록이 없어요"
          description="상품 입력이나 「돈 쓴 것·돈 들어온 것」을 적으면 여기서 달마다 비교해 볼 수 있어요."
        />
      ) : (
        <div className="space-y-4">
          {/* 이 달 결산 */}
          <section className="hero px-5 pb-4 pt-4">
            <p className="text-[17px] font-semibold opacity-85">{monthLabel(baseKey)} 남은 돈</p>
            <p
              className={`text-[clamp(28px,9vw,36px)] font-extrabold leading-tight tracking-[-0.03em] tabular ${
                thisMonth.balance < 0 ? 'text-[#fdba74]' : ''
              }`}
            >
              {thisMonth.balance < 0 ? '−' : ''}
              {formatCurrency(Math.abs(thisMonth.balance))}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/15 pt-2 text-[16px] font-semibold">
              <p>
                <span className="block opacity-80">들어온 돈</span>
                <b className="text-[18px] font-extrabold tabular">{formatCurrency(thisMonth.income)}</b>
              </p>
              <p className="text-right">
                <span className="block opacity-80">나간 돈</span>
                <b className="text-[18px] font-extrabold tabular">{formatCurrency(thisMonth.expense)}</b>
              </p>
            </div>
            <p className="mt-1 text-[16px] font-semibold opacity-80">
              사입 {formatWonShort(thisMonth.purchase)} · 그 밖에 {formatWonShort(thisMonth.otherExpense)}
            </p>
          </section>

          {/* 지난달·작년과 비교 */}
          <section className="card p-4">
            <h2 className="mb-2 text-[19px] font-extrabold">나간 돈 비교</h2>
            <ul className="divide-y divide-line-soft text-[17px] font-semibold">
              <li className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-ink-muted">
                  지난달({monthLabel(prevKey)}) {formatWonShort(lastMonth.expense)}보다
                </span>
                <Signed value={thisMonth.expense - lastMonth.expense} />
              </li>
              {lastYearHas && (
                <li className="flex items-center justify-between gap-2 py-2.5">
                  <span className="text-ink-muted">
                    작년 {monthLabel(lastYearKey)} {formatWonShort(lastYear.expense)}보다
                  </span>
                  <Signed value={thisMonth.expense - lastYear.expense} />
                </li>
              )}
              <li className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-ink-muted">들어온 돈은 지난달보다</span>
                <Signed value={thisMonth.income - lastMonth.income} good="up" />
              </li>
            </ul>
          </section>

          {/* 분류별 지난달 비교 */}
          {compare.length > 0 && (
            <section className="card p-4">
              <h2 className="text-[19px] font-extrabold">어디서 늘고 줄었나요?</h2>
              <p className="mb-2 text-[16px] font-semibold text-ink-soft">
                {monthLabel(baseKey)}과 {monthLabel(prevKey)}의 나간 돈
              </p>
              <ul className="divide-y divide-line-soft">
                {compare.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[18px] font-bold">{row.name}</p>
                      <p className="text-[16px] font-semibold text-ink-soft tabular">
                        {formatManwon(row.before)} → {formatManwon(row.now)}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-[17px] tabular">
                      <Signed value={row.diff} />
                      {row.rate != null && row.diff !== 0 && (
                        <span className="block text-[16px] font-semibold text-ink-soft">
                          {row.rate > 0 ? '+' : ''}
                          {row.rate}%
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 달마다 흐름 */}
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[19px] font-extrabold">달마다 흐름</h2>
              <div className="flex gap-1 rounded-[10px] bg-line-soft p-1" role="radiogroup" aria-label="기간">
                {[6, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={span === n}
                    onClick={() => setSpan(n)}
                    className={`min-h-[2.6rem] rounded-[8px] px-3 text-[16px] font-bold ${
                      span === n ? 'bg-paper text-brand shadow-[var(--shadow-card)]' : 'text-ink-soft'
                    }`}
                  >
                    {n}달
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[16px] font-semibold text-ink-muted">
              <span className="flex items-center gap-1.5">
                <i className="h-3 w-3 rounded-[3px] bg-brand" aria-hidden /> 사입
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-3 w-3 rounded-[3px] bg-accent" aria-hidden /> 그 밖에 나간 돈
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-3 w-3 rounded-[3px] bg-good" aria-hidden /> 들어온 돈
              </span>
            </div>
            <ul className="space-y-3.5">
              {[...keys].reverse().map((key) => {
                const m = months[key]
                return (
                  <li
                    key={key}
                    aria-label={`${monthLabel(key, true)} 나간 돈 ${formatCurrency(m.expense)}, 들어온 돈 ${formatCurrency(m.income)}`}
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span
                        className={`text-[17px] font-bold ${key === baseKey ? 'text-brand' : 'text-ink'}`}
                      >
                        {monthLabel(key, key.slice(0, 4) !== baseKey.slice(0, 4))}
                      </span>
                      <span className="text-[16px] font-semibold text-ink-soft tabular">
                        나간 <b className="text-ink">{formatManwon(m.expense)}</b>
                        {m.income > 0 && (
                          <>
                            {' '}
                            · 남은{' '}
                            <b className={m.balance < 0 ? 'text-accent-dark' : 'text-good'}>
                              {m.balance < 0 ? '−' : ''}
                              {formatManwon(Math.abs(m.balance))}
                            </b>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-line-soft" aria-hidden>
                      <div className="h-3 bg-brand" style={{ width: `${(m.purchase / maxMonth) * 100}%` }} />
                      <div
                        className="h-3 bg-accent"
                        style={{ width: `${(m.otherExpense / maxMonth) * 100}%` }}
                      />
                    </div>
                    {m.income > 0 && (
                      <div className="mt-1 h-3 rounded-full bg-line-soft" aria-hidden>
                        <div
                          className="h-3 rounded-full bg-good"
                          style={{ width: `${(m.income / maxMonth) * 100}%` }}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 border-t border-line-soft pt-3 text-[16px] font-semibold text-ink-muted">
              {span}달 동안 한 달에 평균{' '}
              <b className="text-ink tabular">{formatWonShort(Math.round(spanSummary.expense / span))}</b>{' '}
              나갔어요
            </p>
          </section>

          {/* 많이 쓴 곳 */}
          {spanSummary.byCategory.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-3 text-[19px] font-extrabold">{span}달 동안 많이 쓴 곳</h2>
              <ul className="space-y-3">
                {spanSummary.byCategory.slice(0, 6).map((row) => {
                  const share = spanSummary.expense ? Math.round((row.amount / spanSummary.expense) * 100) : 0
                  return (
                    <li key={row.name} aria-label={`${row.name} ${formatCurrency(row.amount)}, ${share}%`}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="truncate text-[17px] font-bold">{row.name}</span>
                        <span className="shrink-0 text-[17px] font-bold tabular">
                          {formatManwon(row.amount)}
                          <span className="ml-1.5 text-[16px] font-semibold text-ink-soft">{share}%</span>
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-line-soft" aria-hidden>
                        <div
                          className="h-3 rounded-full bg-brand"
                          style={{ width: `${Math.max(2, share)}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Link to="/money/new?type=expense" className="btn btn-outline text-[18px]">
              − 돈 쓴 것
            </Link>
            <Link to="/money/new?type=income" className="btn btn-outline text-[18px]">
              + 돈 들어온 것
            </Link>
          </div>
        </div>
      )}
    </SubPage>
  )
}
