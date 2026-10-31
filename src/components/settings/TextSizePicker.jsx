import { useState } from 'react'
import { getTextSize, setTextSize, TEXT_SIZES } from '../../lib/textSize'

/** 설정: 글씨 크기 (모든 화면에 함께 적용) */
export default function TextSizePicker() {
  const [size, setSize] = useState(getTextSize)
  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        {TEXT_SIZES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setTextSize(item.value)
              setSize(item.value)
            }}
            className={`chip ${size === item.value ? 'chip-on' : ''}`}
            aria-pressed={size === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[16px] font-semibold text-ink-soft">모든 화면의 글씨와 버튼이 함께 커져요</p>
    </div>
  )
}
