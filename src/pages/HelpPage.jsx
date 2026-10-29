import { useState } from 'react'
import SubPage from '../components/SubPage'

const QUESTIONS = [
  [
    '물건은 어떻게 적어요?',
    '아래 가운데 주황색 「물건 적기」를 누르고, 가게 → 가격 → 이름 순서로 고르거나 적으면 돼요.',
  ],
  ['잘못 적었어요', '홈이나 장부에서 그 기록을 누른 뒤 「고치기」를 누르면 돼요.'],
  [
    '실수로 지웠어요',
    '지운 바로 뒤 화면 아래에 뜨는 「되돌리기」를 누르면 다시 살아나요. 시간이 지났다면 백업 파일이 있을 때 설정 → 「백업에서 되살리기」로 되살릴 수 있어요.',
  ],
  [
    '날짜를 바꾸고 싶어요',
    '물건 적기 마지막 단계에서 「더 적기」를 누르면 날짜를 고를 수 있어요. 고르지 않으면 오늘로 적혀요.',
  ],
  [
    '다른 폰과 같이 쓰고 싶어요',
    '설정 → 「다른 폰과 같이 쓰기」에서 초대 주소나 QR을 다른 폰에 보내 주세요.',
  ],
  [
    '폰을 바꿔요',
    '쓰던 폰에서 설정 → 「사진 포함 백업하기」로 파일을 만들고, 새 폰에서 「백업에서 되살리기」로 넣으면 돼요.',
  ],
  ['글씨가 작아요', '설정 → 「글씨 크기」에서 「크게」나 「아주 크게」를 골라 주세요.'],
  ['인터넷이 안 돼도 쓸 수 있나요?', '네. 기록은 폰에 저장돼요. 같이 쓰는 폰과는 인터넷이 될 때 맞춰져요.'],
]

export default function HelpPage() {
  const [open, setOpen] = useState(0)
  return (
    <SubPage title="도움말" backTo="/settings">
      <div className="card divide-y divide-line-soft overflow-hidden">
        {QUESTIONS.map(([question, answer], index) => (
          <div key={question}>
            <button
              type="button"
              onClick={() => setOpen(open === index ? -1 : index)}
              className="flex min-h-[3.75rem] w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={open === index}
            >
              <span className="text-[18px] font-bold text-ink">{question}</span>
              <span className="text-[20px] text-ink-soft" aria-hidden>
                {open === index ? '−' : '+'}
              </span>
            </button>
            {open === index && (
              <p className="px-4 pb-4 text-[17px] font-semibold leading-relaxed text-ink-muted">{answer}</p>
            )}
          </div>
        ))}
      </div>
    </SubPage>
  )
}
