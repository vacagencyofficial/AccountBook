export default function PageHeader({ title, subtitle, children, brand, action }) {
  return (
    <header className="px-4 pb-2 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {brand ? (
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="" className="h-11 w-11 shrink-0" />
              <div>
                <p className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-brand-dark">
                  사입노트
                </p>
                {subtitle && <p className="text-[16px] font-medium text-ink-soft">{subtitle}</p>}
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-brand-dark">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-[16px] font-medium leading-snug text-ink-soft">{subtitle}</p>
              )}
            </>
          )}
        </div>
        {action}
      </div>
      {children}
    </header>
  )
}
