const TEXT_SIZE_KEY = 'sailp-text-size'

/**
 * 화면 전체 배율 (글씨·버튼·간격이 함께 커짐).
 * 예전 1.1 / 1.2 는 확대 시 흐릿해 보여 살짝만 올림.
 */
export const TEXT_SIZES = [
  { value: 'normal', label: '보통', zoom: 1 },
  { value: 'large', label: '크게', zoom: 1.08 },
  { value: 'xlarge', label: '아주 크게', zoom: 1.16 },
]

export function getTextSize() {
  try {
    const stored = localStorage.getItem(TEXT_SIZE_KEY)
    return TEXT_SIZES.some((size) => size.value === stored) ? stored : 'normal'
  } catch {
    return 'normal'
  }
}

export function applyTextSize(value = getTextSize()) {
  const size = TEXT_SIZES.find((item) => item.value === value) ?? TEXT_SIZES[0]
  document.documentElement.style.setProperty('--app-zoom', String(size.zoom))
  // 예전 rem 배율 실험 잔여값 제거
  document.documentElement.style.removeProperty('--app-font-scale')
}

export function setTextSize(value) {
  try {
    localStorage.setItem(TEXT_SIZE_KEY, value)
  } catch {
    // 저장 못 해도 이번에는 적용
  }
  applyTextSize(value)
}
