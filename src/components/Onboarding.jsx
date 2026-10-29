import { useState } from 'react'
import { IconCamera, IconLedger, IconSettings } from './Icons'
import { ONBOARDED_KEY } from '../lib/onboarding'

const SLIDES = [
  {
    icon: IconCamera,
    color: 'bg-accent-soft text-accent',
    title: '산 물건을 바로 적어요',
    body: '아래 가운데 「물건 적기」를 누르고\n가게 → 가격 → 이름만 고르면 끝이에요.',
  },
  {
    icon: IconLedger,
    color: 'bg-brand-soft text-brand',
    title: '쓴 돈이 장부에 쌓여요',
    body: '오늘·이번 달 쓴 돈과\n가게별·종류별로 한눈에 볼 수 있어요.',
  },
  {
    icon: IconSettings,
    color: 'bg-good-soft text-good',
    title: '설정에서 편하게 바꿔요',
    body: '글씨 크기, 다른 폰과 같이 쓰기,\n백업은 모두 「설정」에 있어요.',
  },
]

/** 처음 쓰는 분께 세 장으로 보여 주는 안내 */
export default function Onboarding({ onDone }) {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1
  const Icon = slide.icon

  function finish() {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1')
    } catch {
      // 저장이 막힌 브라우저면 이번에만 닫음
    }
    onDone()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-paper"
      role="dialog"
      aria-modal="true"
      aria-label="사입노트 안내"
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <div className="flex justify-end">
          {!isLast && (
            <button
              type="button"
              onClick={finish}
              className="tap-target px-2 text-[17px] font-bold text-ink-soft"
            >
              건너뛰기
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className={`flex h-28 w-28 items-center justify-center rounded-[32px] ${slide.color}`}>
            <Icon className="h-14 w-14" />
          </span>
          <h2 className="mt-8 text-[26px] font-extrabold leading-snug text-ink">{slide.title}</h2>
          <p className="mt-3 whitespace-pre-line text-[18px] font-semibold leading-relaxed text-ink-muted">
            {slide.body}
          </p>
        </div>

        <div className="mb-5 flex justify-center gap-2" aria-hidden>
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-2.5 rounded-full ${i === index ? 'w-6 bg-brand' : 'w-2.5 bg-line'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (isLast ? finish() : setIndex(index + 1))}
          className="btn btn-primary w-full text-[20px]"
          style={{ minHeight: '3.75rem' }}
        >
          {isLast ? '시작하기' : '다음'}
        </button>
      </div>
    </div>
  )
}
