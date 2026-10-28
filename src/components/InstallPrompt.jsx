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
    <div className="px-4 pt-6">
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[18px] font-extrabold text-brand">홈 화면에 붙여 두실래요?</p>
            <p className="mt-1 text-[16px] font-semibold leading-relaxed text-ink-muted">
              {isIosSafari() ? (
                <>아래쪽 「공유」 버튼을 누른 뒤 「홈 화면에 추가」를 고르면, 앱처럼 편하게 열 수 있어요.</>
              ) : (
                <>한 번만 붙여 두면 아이콘으로 바로 열 수 있어요.</>
              )}
            </p>
          </div>
          <button type="button" onClick={dismiss} className="-mr-2 -mt-2 flex h-12 w-12 shrink-0 items-center justify-center text-[26px] font-bold text-ink-soft" aria-label="닫기">
            ×
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {!isIosSafari() && deferredPrompt && (
            <button
              type="button"
              onClick={handleAndroidInstall}
              className="btn btn-primary flex-1"
            >
              홈에 붙이기
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="btn btn-outline flex-1"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}
