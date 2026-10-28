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

  // 사진은 한 번에 가져와 기록마다 첫 장만 붙임 (기록이 많을 때 기록 수만큼 조회하지 않게)
  const photos = await db.photos.where('itemId').anyOf(items.map((i) => i.id)).sortBy('id')
  const firstPhoto = {}
  for (const photo of photos) {
    if (!(photo.itemId in firstPhoto)) firstPhoto[photo.itemId] = photo
  }

  return items.map((item) => ({ ...item, shop: shopMap[item.shopId], photo: firstPhoto[item.id] }))
}

export async function countShops() {
  return db.shops.count()
}
