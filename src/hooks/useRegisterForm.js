import { useCallback, useEffect, useState } from 'react'
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
  date: '',
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    const parsed = raw ? { ...defaultForm, ...JSON.parse(raw) } : { ...defaultForm }
    if (!parsed.date) parsed.date = getToday()
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
  const [form, setForm] = useState(loadDraft)

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form))
  }, [form])

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
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
      date: prev.date || getToday(),
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
