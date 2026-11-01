/** 카드 할부: 개월 수는 0(일시불·해당 없음) 또는 2~36 */
export const INSTALLMENT_CHOICES = [0, 2, 3, 6, 10, 12]
export const MAX_INSTALLMENT = 36

/** 카드가 아니면 할부 없음, 1개월 이하는 일시불 */
export function normalizeInstallment(payment, months) {
  if (payment !== '카드') return 0
  const n = parseInt(String(months ?? '').replace(/[^0-9]/g, ''), 10) || 0
  if (n < 2) return 0
  return Math.min(MAX_INSTALLMENT, n)
}

export function installmentLabel(months) {
  return months >= 2 ? `${months}개월 할부` : '일시불'
}

/** 한 달에 나가는 돈 (원 단위 반올림, 카드사 수수료는 빼고 대략) */
export function monthlyInstallment(total, months) {
  if (!(months >= 2) || !(total > 0)) return 0
  return Math.round(total / months)
}

/** 목록·상세에 보일 결제 문구: 「카드 · 3개월 할부」 */
export function paymentText(payment, installment) {
  if (!payment) return ''
  if (payment === '카드' && installment >= 2) return `카드 · ${installment}개월 할부`
  return payment
}

/** 엑셀 등에서 읽은 글자 → 개월 수 (「3개월」「3」「일시불」) */
export function parseInstallment(text) {
  const value = String(text ?? '').trim()
  if (!value || value.includes('일시불')) return 0
  const n = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0
  return n >= 2 ? Math.min(MAX_INSTALLMENT, n) : 0
}
