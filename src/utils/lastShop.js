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

export function setLastShopId(shopId) {
  if (shopId == null) return
  localStorage.setItem(LAST_SHOP_KEY, String(shopId))
}
