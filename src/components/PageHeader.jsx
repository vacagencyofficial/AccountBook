export default function PageHeader({ eyebrow, title, subtitle, children, brand }) {
  return (
    <header className="relative overflow-hidden border-b border-line/70 px-5 pb-5 pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(15,110,106,0.12),transparent_55%)]"
      />
      <div className="relative animate-fade-up">
        {brand ? (
          <p className="font-display text-[1.65rem] font-semibold tracking-tight text-ink">
            사입노트
          </p>
        ) : eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            {eyebrow}
          </p>
        ) : null}
        <h1 className={`${brand ? 'mt-1 text-lg font-semibold text-ink-muted' : 'font-display text-2xl font-semibold tracking-tight text-ink'}`}>
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
        {children}
      </div>
    </header>
  )
}
