/** 저장 값(구매·검토·보류)은 그대로 두고, 화면에는 쉬운 말로 보여 줌 */
export const STATUS_LABEL = {
  구매: '샀어요',
  검토: '고민 중',
  보류: '안 사요',
}

export function statusLabel(status) {
  return STATUS_LABEL[status || '구매'] ?? status
}

/** 달력처럼 좁은 칸용: 45000 → "4.5만", 165000 → "17만"(10만 이상은 칸이 좁아 반올림), 5000 → "5천" */
export function formatManwon(amount) {
  const n = Number(amount || 0)
  if (n >= 100000) return `${Math.round(n / 10000).toLocaleString('ko-KR')}만`
  if (n >= 10000) {
    const man = Math.round(n / 1000) / 10
    return `${Number.isInteger(man) ? man : man.toFixed(1)}만`
  }
  if (n >= 1000) return `${Math.round(n / 1000)}천`
  return `${n}원`
}

/** 「4.5만원」「17만원」「500원」처럼 짧게, 끝에 원까지 */
export function formatWonShort(amount) {
  const text = formatManwon(amount)
  return text.endsWith('원') ? text : `${text}원`
}
