import { describe, it, expect } from 'vitest'
import {
  installmentLabel,
  monthlyInstallment,
  normalizeInstallment,
  parseInstallment,
  paymentText,
} from '../src/utils/installment.js'

describe('카드 할부', () => {
  it('카드가 아니면 할부 없음, 1개월 이하는 일시불, 36개월까지', () => {
    expect(normalizeInstallment('현금', 3)).toBe(0)
    expect(normalizeInstallment('카드', 1)).toBe(0)
    expect(normalizeInstallment('카드', '6')).toBe(6)
    expect(normalizeInstallment('카드', 60)).toBe(36)
    expect(normalizeInstallment('카드', undefined)).toBe(0)
  })

  it('한 달 금액은 반올림, 일시불이면 0', () => {
    expect(monthlyInstallment(100000, 3)).toBe(33333)
    expect(monthlyInstallment(100000, 0)).toBe(0)
    expect(monthlyInstallment(0, 3)).toBe(0)
  })

  it('보이는 글자', () => {
    expect(installmentLabel(0)).toBe('일시불')
    expect(installmentLabel(12)).toBe('12개월 할부')
    expect(paymentText('카드', 3)).toBe('카드 · 3개월 할부')
    expect(paymentText('카드', 0)).toBe('카드')
    expect(paymentText('현금', 3)).toBe('현금')
    expect(paymentText('', 0)).toBe('')
  })

  it('엑셀 글자 읽기', () => {
    expect(parseInstallment('3개월')).toBe(3)
    expect(parseInstallment('12')).toBe(12)
    expect(parseInstallment('일시불')).toBe(0)
    expect(parseInstallment('')).toBe(0)
  })
})
