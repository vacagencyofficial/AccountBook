import { db } from './index'

export async function getShopsSorted() {
  return db.shops.orderBy('lastVisitedAt').reverse().toArray()
}

export async function getTodayItems(date) {
  const items = await db.items.where('date').equals(date).sortBy('createdAt')
  return attachShopAndPhoto(items.reverse())
}

export async function getAllItems() {
  const items = await db.items.orderBy('createdAt').reverse().toArray()
  return attachShopAndPhoto(items)
}

export async function getItemsByShop(shopId) {
  const items = await db.items.where('shopId').equals(shopId).sortBy('createdAt')
  return attachShopAndPhoto(items.reverse())
}

export async function attachShopAndPhoto(items) {
  if (items.length === 0) return []

  const shopIds = [...new Set(items.map((i) => i.shopId))]
  const shops = await db.shops.where('id').anyOf(shopIds).toArray()
  const shopMap = Object.fromEntries(shops.map((s) => [s.id, s]))

  return Promise.all(
    items.map(async (item) => {
      const photo = await db.photos.where('itemId').equals(item.id).first()
      return { ...item, shop: shopMap[item.shopId], photo }
    }),
  )
}

export async function countShops() {
  return db.shops.count()
}
