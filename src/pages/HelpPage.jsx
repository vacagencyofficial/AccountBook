import { useState } from 'react'
import SubPage from '../components/SubPage'

const QUESTIONS = [
  [
    '상품은 어떻게 입력해요?',
    '아래 가운데 주황색 「상품 입력」을 누르고, 가게 → 가격 → 이름 순서로 고르거나 적으면 돼요.',
  ],
  [
    '밥값·택시비 같은 돈도 적을 수 있나요?',
    '네. 홈의 「− 돈 쓴 것」이나 「+ 돈 들어온 것」을 누르고 금액과 분류만 고르면 돼요. 장부에서 사입과 함께 한 달 결산(들어온 돈·나간 돈·남은 돈)으로 보여요.',
  ],
  [
    '지난달과 비교해 보고 싶어요',
    '장부 위쪽 「통계」를 누르면 달마다 나간 돈·들어온 돈과 지난달보다 어디서 늘고 줄었는지 보여요.',
  ],
  [
    '월세처럼 매달(매주) 나가는 돈이 있어요',
    '「돈 쓴 것」을 적을 때 「반복되는 돈이에요?」에서 「매달」이나 「매주」를 고르면, 그다음부터는 그날이 되면 장부에 저절로 적혀요. 멈추려면 설정 → 「매달·매주 나가는 돈·들어오는 돈」에서 「멈추기」를 눌러 주세요.',
  ],
  [
    '월세가 올랐어요',
    '설정 → 「매달·매주 나가는 돈·들어오는 돈」에서 그 항목의 「고치기」를 눌러 금액을 바꾸면, 다음 달부터 바뀐 금액으로 적혀요.',
  ],
  [
    '식비만 따로 아껴 쓰고 싶어요',
    '설정 → 「분류별 예산」에서 식비 금액을 정해 두면, 넘었을 때 홈과 통계에서 알려 줘요.',
  ],
  [
    '원하는 분류가 없어요',
    '돈 쓴 것을 적을 때 「+ 분류 만들기」를 누르면 병원비·경조사처럼 원하는 분류를 만들 수 있어요.',
  ],
  [
    '외상을 갚았어요',
    '그 상품이나 가게 화면에서 「갚았어요」를 눌러 주세요. 「오늘 나간 돈으로」를 고르면 가계부에서 갚은 날 나간 돈으로 셈해요.',
  ],
  [
    '한 가게에서 여러 개를 샀어요',
    '「상품 입력」 화면 아래 「여러 개 한 번에 적기」를 누르세요. 가게·날짜는 한 번만 고르고, 상품마다 이름·한 개 가격·개수를 한 줄씩 적은 뒤 한 번에 저장해요.',
  ],
  ['잘못 적었어요', '홈이나 장부에서 그 기록을 누른 뒤 「고치기」를 누르면 돼요.'],
  [
    '실수로 지웠어요',
    '지운 바로 뒤 화면 아래에 뜨는 「되돌리기」를 누르면 다시 살아나요. 시간이 지났다면 백업 파일이 있을 때 설정 → 「백업에서 되살리기」로 되살릴 수 있어요.',
  ],
  [
    '날짜를 바꾸고 싶어요',
    '상품 입력 마지막 단계에서 「더 적기」를 누르면 날짜를 고를 수 있어요. 고르지 않으면 오늘로 적혀요.',
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
