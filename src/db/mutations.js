import { db } from './index'

function normalizeShopData(data) {
  return {
    name: data.name.trim(),
    building: data.building?.trim() ?? '',
    floor: data.floor?.trim() ?? '',
    unit: data.unit?.trim() ?? '',
    phone: data.phone?.trim() ?? '',
    memo: data.memo?.trim() ?? '',
  }
}

export async function createShop(data) {
  const now = Date.now()
  return db.shops.add({
    ...normalizeShopData(data),
    lastVisitedAt: now,
  })
}

export async function updateShop(shopId, data) {
  await db.shops.update(shopId, normalizeShopData(data))
}

export async function deleteShop(shopId) {
  const items = await db.items.where('shopId').equals(shopId).toArray()
  const itemIds = items.map((item) => item.id)

  if (itemIds.length > 0) {
    await db.photos.where('itemId').anyOf(itemIds).delete()
    await db.items.where('shopId').equals(shopId).delete()
  }

  await db.shops.delete(shopId)
}

export async function getShop(shopId) {
  return db.shops.get(shopId)
}

export async function touchShop(shopId) {
  await db.shops.update(shopId, { lastVisitedAt: Date.now() })
}

export async function saveItemWithPhotos({
  shopId,
  date,
  name,
  category,
  color,
  size,
  price,
  qty,
  memo,
  status,
  photoBlobs,
}) {
  const now = Date.now()

  const itemId = await db.items.add({
    shopId,
    date,
    name: name.trim(),
    category: category?.trim() || '기타',
    color: color?.trim() ?? '',
    size: size?.trim() ?? '',
    price: parseInt(String(price).replace(/,/g, ''), 10) || 0,
    qty: parseInt(String(qty).replace(/,/g, ''), 10) || 1,
    memo: memo?.trim() ?? '',
    status: status ?? '구매',
    createdAt: now,
  })

  await db.shops.update(shopId, { lastVisitedAt: now })

  if (photoBlobs?.length) {
    await db.photos.bulkAdd(photoBlobs.map((blob) => ({ itemId, blob })))
  }

  return itemId
}

export async function updateItem(itemId, data) {
  const patch = {}
  if (data.name != null) patch.name = data.name.trim()
  if (data.category != null) patch.category = data.category
  if (data.color != null) patch.color = data.color.trim()
  if (data.size != null) patch.size = data.size.trim()
  if (data.price != null) patch.price = parseInt(String(data.price).replace(/,/g, ''), 10) || 0
  if (data.qty != null) patch.qty = parseInt(String(data.qty).replace(/,/g, ''), 10) || 1
  if (data.memo != null) patch.memo = data.memo.trim()
  if (data.status != null) patch.status = data.status
  if (data.date != null) patch.date = data.date
  await db.items.update(itemId, patch)
}

export async function deleteItem(itemId) {
  await db.photos.where('itemId').equals(itemId).delete()
  await db.items.delete(itemId)
}
