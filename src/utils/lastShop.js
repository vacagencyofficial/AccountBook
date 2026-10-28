const LAST_SHOP_KEY = 'sailp-last-shop-id'

export function getLastShopId() {
  try {
    const raw = localStorage.getItem(LAST_SHOP_KEY)
    if (!raw) return null
    const id = Number(raw)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}

export function clearLastShopId() {
  try {
    localStorage.removeItem(LAST_SHOP_KEY)
  } catch {
    // 저장소를 못 써도 앱은 계속 동작
  }
}

export function setLastShopId(shopId) {
  if (shopId == null) return
  localStorage.setItem(LAST_SHOP_KEY, String(shopId))
}
