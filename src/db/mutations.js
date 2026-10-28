import { db } from './index'
import { syncAfterWrite } from './cloudSync'

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

/** 고친 기록 표시: 다음 동기화 때 올리고, 더 최근 수정이 이기도록 시각을 남김 */
function changed(now = Date.now()) {
  return { dirty: 1, updatedAt: now }
}

/** 클라우드에 올라간 적 있는 것을 지우면 다른 폰에도 알리도록 남겨 둠 */
async function rememberDeletion(kind, cloudId) {
  if (cloudId) await db.deletions.add({ kind, cloudId })
}

export async function createShop(data) {
  const now = Date.now()
  const id = await db.shops.add({
    ...normalizeShopData(data),
    lastVisitedAt: now,
    ...changed(now),
  })
  void syncAfterWrite()
  return id
}

export async function updateShop(shopId, data) {
  await db.shops.update(shopId, { ...normalizeShopData(data), ...changed() })
  void syncAfterWrite()
}

/** 가게 숨기기: 목록·고르기에서만 빠지고 기록은 그대로 */
export async function setShopHidden(shopId, hidden) {
  await db.shops.update(shopId, { hidden: hidden ? 1 : 0, ...changed() })
  void syncAfterWrite()
}

/** 가게와 그 가게의 기록·사진까지 모두 지우기 */
export async function deleteShop(shopId) {
  const shop = await db.shops.get(shopId)
  const items = await db.items.where('shopId').equals(shopId).toArray()
  const itemIds = items.map((item) => item.id)

  await db.transaction('rw', db.shops, db.items, db.photos, db.deletions, async () => {
    for (const item of items) await rememberDeletion('item', item.cloudId)
    await rememberDeletion('shop', shop?.cloudId)
    if (itemIds.length > 0) {
      await db.photos.where('itemId').anyOf(itemIds).delete()
      await db.items.where('shopId').equals(shopId).delete()
    }
    await db.shops.delete(shopId)
  })
  void syncAfterWrite()
}

export async function getShop(shopId) {
  return db.shops.get(shopId)
}

export async function touchShop(shopId) {
  await db.shops.update(shopId, { lastVisitedAt: Date.now(), ...changed() })
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
    ...changed(now),
  })

  await db.shops.update(shopId, { lastVisitedAt: now, ...changed(now) })

  if (photoBlobs?.length) {
    await db.photos.bulkAdd(photoBlobs.map((blob) => ({ itemId, blob })))
  }

  void syncAfterWrite()
  return itemId
}

export async function updateItem(itemId, data) {
  const patch = changed()
  if (data.shopId != null) patch.shopId = data.shopId
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
  void syncAfterWrite()
}

export async function addItemPhotos(itemId, blobs) {
  if (!blobs?.length) return
  await db.photos.bulkAdd(blobs.map((blob) => ({ itemId, blob })))
  void syncAfterWrite()
}

export async function deletePhoto(photoId) {
  const photo = await db.photos.get(photoId)
  await db.transaction('rw', db.photos, db.deletions, async () => {
    await rememberDeletion('photo', photo?.cloudId)
    await db.photos.delete(photoId)
  })
  void syncAfterWrite()
}

export async function deleteItem(itemId) {
  const item = await db.items.get(itemId)
  await db.transaction('rw', db.items, db.photos, db.deletions, async () => {
    // 클라우드에서는 기록을 지우면 그 사진도 함께 지움
    await rememberDeletion('item', item?.cloudId)
    await db.photos.where('itemId').equals(itemId).delete()
    await db.items.delete(itemId)
  })
  void syncAfterWrite()
}
