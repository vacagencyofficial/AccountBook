import { Link } from 'react-router-dom'

/** 하위 화면 공통 틀: 위쪽 「← 뒤로」 + 제목 */
export default function SubPage({ title, subtitle, backTo, onBack, backLabel = '뒤로', children }) {
  const backClass = 'tap-target inline-flex items-center gap-1 px-2 text-[18px] font-bold text-ink-muted'
  return (
    <div className="min-h-dvh bg-wash">
      <header className="sticky top-0 z-10 bg-paper shadow-[0_1px_0_var(--color-line-soft)]">
        <div className="mx-auto max-w-lg px-2 pb-3 pt-2">
          {onBack ? (
            <button type="button" onClick={onBack} className={backClass}>
              ← {backLabel}
            </button>
          ) : (
            <Link to={backTo} className={backClass}>
              ← {backLabel}
            </Link>
          )}
          <h1 className="px-2 text-[24px] font-extrabold leading-tight text-brand-dark">{title}</h1>
          {subtitle && <p className="px-2 text-[16px] font-semibold text-ink-soft">{subtitle}</p>}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-5 pb-12">{children}</main>
    </div>
  )
}
