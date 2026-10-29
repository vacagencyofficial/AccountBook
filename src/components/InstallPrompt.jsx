import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IconShare } from './Icons'
import {
  canPromptInstall,
  isInstalledApp,
  isIosSafari,
  promptInstall,
  subscribeInstall,
} from '../lib/install'

const DISMISS_KEY = 'sailp-install-dismissed'
// 「나중에」를 누르면 일주일 뒤에 다시 한 번만 알려 줌
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

function isSnoozed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const at = Number(raw)
    // 예전 버전은 '1'로 저장했음 → 일주일 지난 것으로 보고 다시 알려 줌
    return at > 1 && Date.now() - at < SNOOZE_MS
  } catch {
    return false
  }
}

export default function InstallPrompt() {
  const { pathname } = useLocation()
  const ios = isIosSafari()
  const [canPrompt, setCanPrompt] = useState(canPromptInstall)
  const [hidden, setHidden] = useState(() => isInstalledApp() || isSnoozed())
  const [showIosHelp, setShowIosHelp] = useState(false)
  const available = !hidden && (ios || canPrompt)

  useEffect(() => subscribeInstall(() => setCanPrompt(canPromptInstall())), [])

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // 저장이 막힌 브라우저면 이번에만 닫음
    }
    setHidden(true)
  }

  async function handleInstall() {
    if (ios) {
      setShowIosHelp((v) => !v)
      return
    }
    if (await promptInstall()) setHidden(true)
  }

  // 홈 화면에서만, 하단 메뉴 바로 위에 작은 띠로
  if (!available || pathname !== '/') return null

  return (
    <div
      className="fixed inset-x-0 z-20 px-3"
      style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom))' }}
      role="region"
      aria-label="홈 화면에 추가"
    >
      <div className="mx-auto max-w-lg rounded-[14px] bg-ink px-3 py-3 text-white shadow-[0_4px_16px_rgb(15_23_42/0.18)]">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1 leading-snug">
            <p className="text-[17px] font-extrabold">홈 화면에 추가</p>
            <p className="text-[16px] font-semibold text-white/70">앱처럼 바로 열려요</p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="btn min-h-[2.75rem] shrink-0 bg-white px-3 text-[16px] text-ink"
          >
            {ios ? '방법 보기' : '추가'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="-mr-1 flex h-11 w-9 shrink-0 items-center justify-center text-[24px] font-bold text-white/70"
            aria-label="나중에 하기"
          >
            ×
          </button>
        </div>
        {showIosHelp && (
          <p className="mt-3 border-t border-white/15 pt-3 text-[16px] font-semibold leading-relaxed">
            화면 아래 <IconShare className="mx-0.5 inline h-5 w-5 align-[-3px]" /> 「공유」를 누르고
            <br />
            「홈 화면에 추가」를 골라 주세요.
          </p>
        )}
      </div>
    </div>
  )
}
