import { formatCurrency } from '../../utils/format'
import { formatWonShort } from '../../utils/labels'

/** 장부 맨 위 결산: 나간 돈(사입·그 밖), 들어온 돈·남은 돈, 판매가 적은 것의 남는 돈 */
export default function HistoryHero({ label, isLoading, ledger, summary, profit, showSettlement }) {
  return (
    <div className="hero px-5 pb-4 pt-4">
      <p className="text-[17px] font-semibold opacity-85">{label}</p>
      <p className="text-[clamp(28px,9vw,36px)] font-extrabold leading-tight tracking-[-0.03em] tabular [overflow-wrap:anywhere]">
        {isLoading ? '…' : formatCurrency(ledger.expense)}
      </p>
      <p className="mt-1 text-[16px] font-semibold opacity-80">
        {ledger.otherExpense > 0
          ? `사입 ${formatWonShort(ledger.purchase)} · 그 밖에 ${formatWonShort(ledger.otherExpense)}`
          : summary.count
            ? `${summary.count}건 · ${summary.qty}개`
            : '아직 산 것이 없어요'}
        {summary.pendingCount > 0 && ` · 고민 중·안 사요 ${summary.pendingCount}건 제외`}
      </p>
      {showSettlement && (
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/15 pt-2 text-[16px] font-semibold">
          <p>
            <span className="block opacity-80">들어온 돈</span>
            <b className="text-[18px] font-extrabold tabular">{formatCurrency(ledger.income)}</b>
          </p>
          <p className="text-right">
            <span className="block opacity-80">남은 돈</span>
            <b className={`text-[18px] font-extrabold tabular ${ledger.balance < 0 ? 'text-[#fdba74]' : ''}`}>
              {ledger.balance < 0 ? '−' : ''}
              {formatCurrency(Math.abs(ledger.balance))}
            </b>
          </p>
        </div>
      )}
      {profit.count > 0 && (
        <p className="mt-2 border-t border-white/15 pt-2 text-[16px] font-semibold">
          <span className="opacity-80">판매가 적은 {profit.count}건 · 남는 돈 </span>
          <b className="text-[18px] font-extrabold tabular">{formatCurrency(profit.total)}</b>
        </p>
      )}
    </div>
  )
}
