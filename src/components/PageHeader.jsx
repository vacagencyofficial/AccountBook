export default function PageHeader({ title, subtitle, children, brand, action }) {
  return (
    <header className="border-b border-line px-4 pb-4 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {brand ? (
            <>
              <p className="text-[22px] font-bold tracking-[-0.03em] text-ink">사입노트</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>
            </>
          ) : (
            <>
              <h1 className="text-[20px] font-bold tracking-[-0.02em] text-ink">{title}</h1>
              {subtitle && <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>}
            </>
          )}
        </div>
        {action}
      </div>
      {children}
    </header>
  )
}
