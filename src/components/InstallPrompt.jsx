import { useEffect, useState } from 'react'

const DISMISS_KEY = 'sailp-install-dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIosSafari() {
  const ua = window.navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
  return isIos && isSafari
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    if (isStandalone()) return
    if (localStorage.getItem(DISMISS_KEY)) return

    if (isIosSafari()) {
      setVisible(true)
      return
    }

    function handleBeforeInstall(event) {
      event.preventDefault()
      setDeferredPrompt(event)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-14 z-40 px-4 pb-2">
      <div className="mx-auto max-w-lg border border-line bg-paper p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-ink">홈 화면에 추가</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
              {isIosSafari() ? (
                <>
                  Safari 공유 → 홈 화면에 추가하면 데이터가 더 안정적으로 유지됩니다.
                </>
              ) : (
                <>앱처럼 쓰고 오프라인에서도 기록을 보관할 수 있습니다.</>
              )}
            </p>
          </div>
          <button type="button" onClick={dismiss} className="text-ink-muted" aria-label="닫기">
            ×
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {!isIosSafari() && deferredPrompt && (
            <button
              type="button"
              onClick={handleAndroidInstall}
              className="flex-1 bg-ink py-2.5 text-[13px] font-semibold text-white"
            >
              앱 설치
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 border border-line py-2.5 text-[13px] font-medium text-ink-muted"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}
