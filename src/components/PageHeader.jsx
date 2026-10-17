export default function PageHeader({ title, subtitle, children, brand, action, tone = 'brand' }) {
  const tones = {
    brand: 'from-brand-soft to-paper border-brand/20',
    good: 'from-good-soft to-paper border-good/20',
    ledger: 'from-ledger-soft to-paper border-ledger/20',
    accent: 'from-accent-soft to-paper border-accent/20',
  }

  return (
    <header className={`border-b-2 bg-gradient-to-b px-4 pb-4 pt-5 ${tones[tone] || tones.brand}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {brand ? (
            <>
              <p className="text-[28px] font-black tracking-[-0.03em] text-brand-dark">사입노트</p>
              <p className="mt-1 text-[15px] font-medium text-ink-muted">{subtitle}</p>
            </>
          ) : (
            <>
              <h1 className="text-[24px] font-black tracking-[-0.02em] text-ink">{title}</h1>
              {subtitle && <p className="mt-1 text-[15px] font-medium text-ink-muted">{subtitle}</p>}
            </>
          )}
        </div>
        {action}
      </div>
      {children}
    </header>
  )
}
