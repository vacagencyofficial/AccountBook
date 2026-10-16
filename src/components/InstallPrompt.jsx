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
      <div className="mx-auto max-w-lg rounded-2xl border border-brand/20 bg-white p-4 shadow-lg shadow-brand/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">홈 화면에 추가하세요</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {isIosSafari() ? (
                <>
                  Safari 하단 <strong className="text-slate-700">공유</strong> 버튼(
                  <ShareIcon />
                  ) → <strong className="text-slate-700">홈 화면에 추가</strong>를 선택하세요.
                  <br />
                  iOS에서는 홈 화면에 추가해야 데이터가 안정적으로 유지됩니다.
                </>
              ) : (
                <>앱처럼 사용하고 오프라인에서도 기록을 안전하게 보관할 수 있습니다.</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 text-slate-400 hover:text-slate-600"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {!isIosSafari() && deferredPrompt && (
            <button
              type="button"
              onClick={handleAndroidInstall}
              className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white"
            >
              앱 설치
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-slate-600"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg
      className="mb-0.5 inline h-4 w-4 text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5-5 5 5M12 5v12"
      />
    </svg>
  )
}
