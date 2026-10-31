import { formatCurrency } from '../../utils/format'
import { formatWonShort } from '../../utils/labels'
import { monthLabel } from './statsHelpers'

/** 이 달 결산: 남은 돈, 들어온 돈·나간 돈(사입·그 밖) */
export default function StatsMonthHero({ thisMonth, baseKey }) {
  return (
    <>
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
    </>
  )
}
