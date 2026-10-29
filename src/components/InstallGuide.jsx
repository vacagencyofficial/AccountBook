import { useEffect, useState } from 'react'
import { IconShare } from './Icons'
import { canPromptInstall, isInstalledApp, isIos, promptInstall, subscribeInstall } from '../lib/install'

function Steps({ steps }) {
  return (
    <ol className="mt-3 space-y-2.5">
      {steps.map((step, index) => (
        <li key={index} className="flex items-center gap-3 text-[17px] font-semibold text-ink">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[16px] font-extrabold text-brand">
            {index + 1}
          </span>
          <span className="leading-snug">{step}</span>
        </li>
      ))}
    </ol>
  )
}

const Key = ({ children }) => (
  <b className="mx-0.5 inline-flex items-center gap-1 rounded-[6px] bg-line-soft px-1.5 py-0.5 font-extrabold">
    {children}
  </b>
)

/** 설정의 「홈 화면에 추가」: 지금 쓰는 폰에 맞는 방법 하나만 보여 줌 */
export default function InstallGuide() {
  const [installed, setInstalled] = useState(isInstalledApp)
  const [canPrompt, setCanPrompt] = useState(canPromptInstall)
  const isAndroid = /android/i.test(navigator.userAgent)

  useEffect(() => subscribeInstall(() => setCanPrompt(canPromptInstall())), [])

  if (installed) {
    return (
      <div className="flex items-center gap-3 px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-good-soft text-[18px] font-extrabold text-good">
          ✓
        </span>
        <div>
          <p className="text-[18px] font-bold text-ink">홈 화면에 추가되어 있어요</p>
          <p className="text-[16px] font-semibold text-ink-soft">아이콘을 눌러 바로 열 수 있어요</p>
        </div>
      </div>
    )
  }

  if (canPrompt) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-11 w-11 shrink-0" />
          <div className="min-w-0">
            <p className="text-[18px] font-bold text-ink">홈 화면에 추가</p>
            <p className="text-[16px] font-semibold text-ink-soft">앱처럼 바로 열 수 있어요</p>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => setInstalled(await promptInstall())}
          className="btn btn-primary shrink-0 text-[17px]"
        >
          추가하기
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="h-11 w-11 shrink-0" />
        <div>
          <p className="text-[18px] font-bold text-ink">홈 화면에 추가하는 방법</p>
          <p className="text-[16px] font-semibold text-ink-soft">한 번만 하면 앱처럼 바로 열려요</p>
        </div>
      </div>
      {isIos() ? (
        <Steps
          steps={[
            <>
              화면 아래{' '}
              <Key>
                <IconShare className="h-5 w-5" />
                공유
              </Key>{' '}
              누르기
            </>,
            <>
              <Key>홈 화면에 추가</Key> 고르기
            </>,
            <>
              오른쪽 위 <Key>추가</Key> 누르기
            </>,
          ]}
        />
      ) : isAndroid ? (
        <Steps
          steps={[
            <>
              오른쪽 위 <Key>⋮</Key> 또는 아래 <Key>≡</Key> 누르기
            </>,
            <>
              <Key>홈 화면에 추가</Key> 고르기
            </>,
            <>
              <Key>추가</Key> 누르기
            </>,
          ]}
        />
      ) : (
        <p className="mt-3 text-[16px] font-semibold leading-relaxed text-ink-soft">
          폰에서 이 주소를 열면 홈 화면에 추가할 수 있어요.
        </p>
      )}
    </div>
  )
}
