export default function PageHeader({ title, subtitle, children, brand, action }) {
  return (
    <header className="px-4 pb-2 pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {brand ? (
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-accent to-[#f59e0b] text-[22px] font-black text-white"
                aria-hidden
              >
                사
              </span>
              <div>
                <p className="text-[24px] font-extrabold leading-tight text-brand-dark">사입노트</p>
                {subtitle && <p className="text-[16px] font-semibold text-ink-soft">{subtitle}</p>}
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-[26px] font-extrabold leading-tight text-brand-dark">{title}</h1>
              {subtitle && <p className="mt-1 text-[16px] font-semibold leading-snug text-ink-soft">{subtitle}</p>}
            </>
          )}
        </div>
        {action}
      </div>
      {children}
    </header>
  )
}
