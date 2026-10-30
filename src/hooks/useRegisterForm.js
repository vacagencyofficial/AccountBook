import { useCallback, useEffect, useState } from 'react'
import { useToday } from './useToday'
import { getLastShopId, setLastShopId } from '../utils/lastShop'
import { getToday } from '../utils/format'

const DRAFT_KEY = 'sailp-register-draft'

const defaultForm = {
  shopId: null,
  name: '',
  category: '기타',
  price: '',
  qty: '1',
  color: '',
  size: '',
  memo: '',
  status: '구매',
  payment: '',
  salePrice: '',
  date: '',
  // 날짜를 직접 고르지 않았으면(「오늘」 그대로) 날이 바뀔 때 오늘로 따라감
  dateAuto: true,
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    const parsed = raw ? { ...defaultForm, ...JSON.parse(raw) } : { ...defaultForm }
    // 어제 적다 만 초안을 오늘 다시 열어도, 날짜를 직접 고른 게 아니면 오늘로
    if (!parsed.date || parsed.dateAuto !== false) parsed.date = getToday()
    if (parsed.shopId == null) {
      const lastShop = getLastShopId()
      if (lastShop) parsed.shopId = lastShop
    }
    return parsed
  } catch {
    const fallback = { ...defaultForm, date: getToday() }
    const lastShop = getLastShopId()
    if (lastShop) fallback.shopId = lastShop
    return fallback
  }
}

export function useRegisterForm() {
  const [rawForm, setForm] = useState(loadDraft)
  const today = useToday()
  // 앱을 켜 둔 채 자정이 지나도 날짜를 직접 고르지 않았으면 「오늘」을 따라감
  const form = rawForm.dateAuto !== false && rawForm.date !== today ? { ...rawForm, date: today } : rawForm

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rawForm))
  }, [rawForm])

  const updateField = useCallback((key, value) => {
    setForm((prev) =>
      key === 'date' ? { ...prev, date: value, dateAuto: value === getToday() } : { ...prev, [key]: value },
    )
  }, [])

  const selectShop = useCallback((shopId) => {
    setForm((prev) => ({ ...prev, shopId }))
    setLastShopId(shopId)
  }, [])

  // 다음 물건도 같은 날·같은 가게일 때가 많아 날짜와 가게는 그대로 둠
  const resetForNextItem = useCallback((keptShopId) => {
    setForm((prev) => ({
      ...defaultForm,
      shopId: keptShopId,
      date: prev.dateAuto !== false ? getToday() : prev.date,
      dateAuto: prev.dateAuto,
    }))
  }, [])

  const clearDraft = useCallback(() => {
    setForm({ ...defaultForm, date: getToday() })
    sessionStorage.removeItem(DRAFT_KEY)
  }, [])

  const isValid = Boolean(form.shopId && (form.name.trim() || form.memo.trim()) && form.price !== '')

  return {
    form,
    updateField,
    selectShop,
    resetForNextItem,
    clearDraft,
    isValid,
  }
}
