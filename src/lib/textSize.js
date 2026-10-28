const TEXT_SIZE_KEY = 'sailp-text-size'

/** 화면 전체를 확대하는 배율 (글씨·버튼·간격이 함께 커져 배치가 깨지지 않음) */
export const TEXT_SIZES = [
  { value: 'normal', label: '보통', zoom: 1 },
  { value: 'large', label: '크게', zoom: 1.1 },
  { value: 'xlarge', label: '아주 크게', zoom: 1.2 },
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
}

export function setTextSize(value) {
  try {
    localStorage.setItem(TEXT_SIZE_KEY, value)
  } catch {
    // 저장 못 해도 이번에는 적용
  }
  applyTextSize(value)
}
