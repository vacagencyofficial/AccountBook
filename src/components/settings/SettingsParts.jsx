import { createPortal } from 'react-dom'

/** 설정 화면 공통 틀: 제목 있는 카드, 누르는 줄, 보기만 하는 줄 */
export function SettingsSection({ title, children }) {
  return (
    <div>
      <h2 className="mb-2 px-0.5 text-[18px] font-extrabold text-ink">{title}</h2>
      <div className="card divide-y divide-line-soft overflow-hidden">{children}</div>
    </div>
  )
}

export function SettingsButton({ label, description, onClick, disabled, danger, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[4rem] w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:opacity-50"
    >
      <div>
        <p className={`text-[18px] font-bold ${danger ? 'text-red-700' : 'text-ink'}`}>{label}</p>
        <p className="mt-0.5 text-[16px] font-semibold text-ink-soft">{description}</p>
      </div>
      <span className="text-[24px] text-ink-soft" aria-hidden>
        {trailing}
      </span>
    </button>
  )
}

export function SettingsRow({ label, description }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[18px] font-bold text-ink">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-[16px] font-semibold leading-snug text-ink-soft">
        {description}
      </p>
    </div>
  )
}

/**
 * 확인 창 등 화면 위에 뜨는 것: 카드 안(줄 사이 선이 그어지는 곳)이 아니라 화면 맨 끝에 그림
 */
export function Overlay({ children }) {
  return createPortal(children, document.body)
}
