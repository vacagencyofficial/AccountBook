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
    <div className="fixed inset-x-0 bottom-16 z-40 px-4 pb-2">
      <div className="mx-auto max-w-lg border-2 border-brand/40 bg-paper p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[16px] font-black text-brand">홈 화면에 붙여 두실래요?</p>
            <p className="mt-1 text-[14px] font-semibold leading-relaxed text-ink-muted">
              {isIosSafari() ? (
                <>아래쪽 「공유」 버튼을 누른 뒤 「홈 화면에 추가」를 고르면, 앱처럼 편하게 열 수 있어요.</>
              ) : (
                <>한 번만 붙여 두면 아이콘으로 바로 열 수 있어요.</>
              )}
            </p>
          </div>
          <button type="button" onClick={dismiss} className="text-[22px] font-bold text-ink-muted" aria-label="닫기">
            ×
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {!isIosSafari() && deferredPrompt && (
            <button
              type="button"
              onClick={handleAndroidInstall}
              className="tap-target flex-1 bg-brand text-[15px] font-black text-white"
            >
              홈에 붙이기
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="tap-target flex-1 border-2 border-line text-[15px] font-bold text-ink-muted"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}
