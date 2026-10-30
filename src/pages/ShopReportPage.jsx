import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SubPage from '../components/SubPage'
import EmptyState from '../components/EmptyState'
import { db } from '../db'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { isPurchased } from '../utils/analytics'
import { formatCurrency, itemTotal } from '../utils/format'
import { formatManwon } from '../utils/labels'

const RANGES = [3, 6, 12]

/** 오늘 기준 최근 n달: [{ key: '2026-10', label: '10월' }, …] (오래된 달부터) */
function recentMonths(n, today = new Date()) {
  const months = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ key, label: `${d.getMonth() + 1}월` })
  }
  return months
}

/** 가게별 월 리포트: 최근 몇 달 동안 가게마다 매달 얼마 샀는지 */
export default function ShopReportPage() {
  const [range, setRange] = useState(6)
  const { data } = useLiveQuery(
    async () => ({ shops: await db.shops.toArray(), items: await db.items.toArray() }),
    [],
  )

  const report = useMemo(() => {
    if (!data) return null
    const months = recentMonths(range)
    const keys = new Set(months.map((m) => m.key))
    const byShop = new Map()
    const monthTotals = Object.fromEntries(months.map((m) => [m.key, 0]))
    for (const item of data.items) {
      const key = (item.date || '').slice(0, 7)
      if (!keys.has(key) || !isPurchased(item)) continue
      const amount = itemTotal(item)
      if (!byShop.has(item.shopId)) byShop.set(item.shopId, { total: 0, count: 0, months: {} })
      const row = byShop.get(item.shopId)
      row.total += amount
      row.count += 1
      row.months[key] = (row.months[key] ?? 0) + amount
      monthTotals[key] += amount
    }
    const shopMap = new Map(data.shops.map((s) => [s.id, s]))
    const rows = [...byShop.entries()]
      .map(([shopId, row]) => ({ shop: shopMap.get(shopId), shopId, ...row }))
      .sort((a, b) => b.total - a.total)
    const max = Math.max(1, ...rows.flatMap((row) => Object.values(row.months)))
    const grand = rows.reduce((sum, row) => sum + row.total, 0)
    return { months, rows, monthTotals, max, grand }
  }, [data, range])

  return (
    <SubPage title="가게별 리포트" subtitle="달마다 어느 가게에서 얼마 샀는지" backTo="/shops">
      <div
        className="mb-4 grid grid-cols-3 gap-1 rounded-[12px] bg-line-soft p-1"
        role="radiogroup"
        aria-label="기간"
      >
        {RANGES.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={range === n}
            onClick={() => setRange(n)}
            className={`min-h-[2.75rem] rounded-[9px] text-[17px] font-bold ${
              range === n ? 'bg-paper text-brand shadow-[var(--shadow-card)]' : 'text-ink-soft'
            }`}
          >
            최근 {n}달
          </button>
        ))}
      </div>

      {!report ? (
        <div className="skeleton h-60" />
      ) : report.rows.length === 0 ? (
        <EmptyState
          title="이 기간에 산 기록이 없어요"
          description="기간을 늘려 보거나 상품을 입력해 주세요."
        />
      ) : (
        <>
          <section className="card mb-4 p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[18px] font-extrabold text-ink">최근 {range}달 모두</h2>
              <b className="text-[20px] font-extrabold text-brand tabular">{formatCurrency(report.grand)}</b>
            </div>
            <MonthBars
              months={report.months}
              values={report.monthTotals}
              max={Math.max(1, ...Object.values(report.monthTotals))}
            />
          </section>

          <ul className="space-y-3" aria-label="가게별">
            {report.rows.map((row, index) => (
              <li key={row.shopId} className="card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    to={`/shops/${row.shopId}`}
                    className="min-w-0 truncate text-[19px] font-extrabold text-ink"
                  >
                    <span className="mr-1.5 text-ink-soft tabular">{index + 1}</span>
                    {row.shop?.name ?? '지운 가게'}
                  </Link>
                  <b className="shrink-0 text-[19px] font-extrabold text-brand tabular">
                    {formatCurrency(row.total)}
                  </b>
                </div>
                <p className="text-[16px] font-semibold text-ink-soft">
                  {row.count}건 · 전체의 {Math.round((row.total / report.grand) * 100)}%
                </p>
                <MonthBars months={report.months} values={row.months} max={report.max} />
              </li>
            ))}
          </ul>
        </>
      )}
    </SubPage>
  )
}

/** 달마다 막대 + 금액 (12달이면 금액은 숨기고 막대만) */
function MonthBars({ months, values, max }) {
  const dense = months.length > 6
  return (
    <div
      className="mt-3 grid items-end gap-1.5"
      style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
    >
      {months.map((month) => {
        const value = values[month.key] ?? 0
        return (
          <div key={month.key} className="flex min-w-0 flex-col items-center gap-1">
            {!dense && (
              <span className="text-[16px] font-bold text-ink tabular">
                {value ? formatManwon(value) : '–'}
              </span>
            )}
            <div className="flex h-16 w-full items-end rounded-[6px] bg-wash" aria-hidden>
              <div
                className="w-full rounded-[6px] bg-brand"
                style={{ height: `${value ? Math.max(6, (value / max) * 100) : 0}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-[16px] font-semibold text-ink-soft">{month.label}</span>
          </div>
        )
      })}
    </div>
  )
}
