import { useCallback, useEffect, useRef, useState } from 'react'
import { ToastContext } from './toastContext'
import { useLocation } from 'react-router-dom'

/** 화면 아래에 잠깐 뜨는 알림. 「되돌리기」 같은 버튼을 하나 붙일 수 있음 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const close = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback(
    (message, { actionLabel, onAction, duration = actionLabel ? 6000 : 2500 } = {}) => {
      clearTimeout(timer.current)
      setToast({ message, actionLabel, onAction, key: Date.now() })
      timer.current = setTimeout(() => setToast(null), duration)
    },
    [],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <ToastBar toast={toast} onClose={close} />}
    </ToastContext.Provider>
  )
}

// 하단 메뉴가 있는 화면에서는 메뉴 위에 띄움
const PAGES_WITH_NAV = ['/', '/history', '/shops', '/settings']

function ToastBar({ toast, onClose }) {
  const { pathname } = useLocation()
  const bottom = PAGES_WITH_NAV.includes(pathname)
    ? 'calc(5.5rem + env(safe-area-inset-bottom))'
    : 'calc(1rem + env(safe-area-inset-bottom))'

  async function handleAction() {
    onClose()
    await toast.onAction?.()
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 z-50 px-3" style={{ bottom }}>
      <div
        key={toast.key}
        role="status"
        aria-live="polite"
        className="pointer-events-auto mx-auto flex min-h-[3.5rem] max-w-lg items-center justify-between gap-3 rounded-[14px] bg-ink px-4 py-2 text-white shadow-[0_4px_16px_rgb(15_23_42/0.2)]"
      >
        <p className="text-[17px] font-bold">{toast.message}</p>
        {toast.actionLabel && (
          <button
            type="button"
            onClick={handleAction}
            className="min-h-[2.75rem] shrink-0 px-2 text-[17px] font-extrabold text-[#fdba74]"
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
