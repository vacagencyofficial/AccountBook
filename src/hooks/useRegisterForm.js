import { useCallback, useEffect, useState } from 'react'
import { getLastShopId, setLastShopId } from '../utils/lastShop'

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
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    const parsed = raw ? { ...defaultForm, ...JSON.parse(raw) } : { ...defaultForm }
    if (parsed.shopId == null) {
      const lastShop = getLastShopId()
      if (lastShop) parsed.shopId = lastShop
    }
    return parsed
  } catch {
    const fallback = { ...defaultForm }
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

  const resetForNextItem = useCallback((keptShopId) => {
    setForm({
      ...defaultForm,
      shopId: keptShopId,
      status: '구매',
      category: '기타',
      qty: '1',
    })
  }, [])

  const clearDraft = useCallback(() => {
    setForm({ ...defaultForm })
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
