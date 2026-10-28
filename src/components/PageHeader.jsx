const tones = {
  brand: {
    wrap: 'from-[#dbeafe] via-[#eef4ff] to-paper border-brand/35',
    title: 'text-brand-dark',
    rail: 'bg-brand',
  },
  good: {
    wrap: 'from-[#dcfce7] via-[#f0fdf4] to-paper border-good/35',
    title: 'text-good',
    rail: 'bg-good',
  },
  ledger: {
    wrap: 'from-[#ede9fe] via-[#f5f3ff] to-paper border-ledger/35',
    title: 'text-ledger',
    rail: 'bg-ledger',
  },
  accent: {
    wrap: 'from-[#ffedd5] via-[#fff7ed] to-paper border-accent/35',
    title: 'text-accent-dark',
    rail: 'bg-accent',
  },
}

export default function PageHeader({ title, subtitle, children, brand, action, tone = 'brand' }) {
  const t = tones[tone] || tones.brand

  return (
    <header className={`relative overflow-hidden border-b-2 bg-gradient-to-b px-4 pb-4 pt-5 ${t.wrap}`}>
      <div className={`absolute inset-y-0 left-0 w-1.5 ${t.rail}`} aria-hidden />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          {brand ? (
            <>
              <p className={`text-[30px] font-black tracking-[-0.03em] ${t.title}`}>사입노트</p>
              <p className="mt-1 text-[16px] font-semibold text-ink-muted">{subtitle}</p>
            </>
          ) : (
            <>
              <h1 className={`text-[26px] font-black tracking-[-0.02em] ${t.title}`}>{title}</h1>
              {subtitle && <p className="mt-1 text-[16px] font-semibold leading-snug text-ink-muted">{subtitle}</p>}
            </>
          )}
        </div>
        {action}
      </div>
      {children}
    </header>
  )
}
