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

/**
 * 장부를 통째로 바꾸기 전에(엑셀·백업 덮어쓰기): 클라우드에 올라간 가게·기록 중
 * 새 내용에 없는 것은 지움 표시를 남겨, 다음 맞추기 때 되살아나지 않고 다른 폰에서도 지워지게 함.
 * db.shops·db.items·db.entries·db.deletions 를 포함한 트랜잭션 안에서 부름
 */
export async function rememberReplacedRecords(keepCloudIds = new Set(), { entries = true } = {}) {
  for (const shop of await db.shops.toArray()) {
    if (shop.cloudId && !keepCloudIds.has(shop.cloudId)) await rememberDeletion('shop', shop.cloudId)
  }
  for (const item of await db.items.toArray()) {
    // 클라우드에서 기록을 지우면 그 사진도 함께 지워짐
    if (item.cloudId && !keepCloudIds.has(item.cloudId)) await rememberDeletion('item', item.cloudId)
  }
  // 가계부 없이 장부만 바꿀 때(옛 엑셀)는 가계부 기록을 그대로 둠
  for (const entry of entries ? await db.entries.toArray() : []) {
    if (entry.cloudId && !keepCloudIds.has(entry.cloudId)) await rememberDeletion('entry', entry.cloudId)
  }
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
  payment,
  salePrice,
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
    payment: payment ?? '',
    settled: 0,
    salePrice: parseInt(String(salePrice ?? '').replace(/,/g, ''), 10) || 0,
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
  if (data.salePrice != null) patch.salePrice = parseInt(String(data.salePrice).replace(/,/g, ''), 10) || 0
  if (data.payment != null) {
    patch.payment = data.payment
    // 외상이 아니게 바꾸면 「갚음」 표시도 지움
    if (data.payment !== '외상') patch.settled = 0
  }
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

/** 사진 여러 장 한 번에 지우기(오래된 사진 정리). 기록은 그대로 */
export async function deletePhotos(photoIds) {
  await db.transaction('rw', db.photos, db.deletions, async () => {
    for (const photo of await db.photos.bulkGet(photoIds)) {
      if (!photo) continue
      await rememberDeletion('photo', photo.cloudId)
      await db.photos.delete(photo.id)
    }
  })
  void syncAfterWrite()
}

/** 외상 갚음 표시 켜고 끄기 */
export async function setItemSettled(itemId, settled) {
  await db.items.update(itemId, { settled: settled ? 1 : 0, ...changed() })
  void syncAfterWrite()
}

/** 별표 켜고 끄기 */
export async function setItemStarred(itemId, starred) {
  await db.items.update(itemId, { starred: starred ? 1 : 0, ...changed() })
  void syncAfterWrite()
}

/** 기록 지우기. 「되돌리기」에 쓰도록 지운 기록과 사진을 돌려줌 */
export async function deleteItem(itemId) {
  const item = await db.items.get(itemId)
  let photos = []
  await db.transaction('rw', db.items, db.photos, db.deletions, async () => {
    photos = await db.photos.where('itemId').equals(itemId).toArray()
    // 클라우드에서는 기록을 지우면 그 사진도 함께 지움
    await rememberDeletion('item', item?.cloudId)
    await db.photos.where('itemId').equals(itemId).delete()
    await db.items.delete(itemId)
  })
  void syncAfterWrite()
  return item ? { item, photos } : null
}

/**
 * 방금 지운 기록 되살리기. 클라우드 쪽은 이미 지워졌을 수 있어
 * 클라우드 연결을 끊고 새 기록으로 다시 올림
 */
export async function restoreItem(snapshot) {
  if (!snapshot) return
  const { cloudId: _itemCloudId, ...item } = snapshot.item
  await db.transaction('rw', db.items, db.photos, async () => {
    await db.items.put({ ...item, ...changed() })
    for (const photo of snapshot.photos) {
      const { cloudId: _photoCloudId, legacy: _legacy, ...rest } = photo
      await db.photos.put(rest)
    }
  })
  void syncAfterWrite()
}

/** 가계부 기록(지출·수입) 값 정리 */
function normalizeEntry(data) {
  const type = data.type === 'income' ? 'income' : 'expense'
  return {
    type,
    date: data.date,
    amount: parseInt(String(data.amount ?? '').replace(/,/g, ''), 10) || 0,
    category: data.category || (type === 'income' ? '판매' : '기타'),
    memo: data.memo?.trim() ?? '',
    payment: type === 'expense' ? (data.payment ?? '') : '',
  }
}

export async function createEntry(data) {
  const now = Date.now()
  const id = await db.entries.add({ ...normalizeEntry(data), createdAt: now, ...changed(now) })
  void syncAfterWrite()
  return id
}

export async function updateEntry(entryId, data) {
  await db.entries.update(entryId, { ...normalizeEntry(data), ...changed() })
  void syncAfterWrite()
}

/** 가계부 기록 지우기. 「되돌리기」에 쓰도록 지운 기록을 돌려줌 */
export async function deleteEntry(entryId) {
  const entry = await db.entries.get(entryId)
  await db.transaction('rw', db.entries, db.deletions, async () => {
    await rememberDeletion('entry', entry?.cloudId)
    await db.entries.delete(entryId)
  })
  void syncAfterWrite()
  return entry ?? null
}

/** 방금 지운 가계부 기록 되살리기 (새 기록으로 다시 올림) */
export async function restoreEntry(entry) {
  if (!entry) return
  const { cloudId: _cloudId, ...rest } = entry
  await db.entries.put({ ...rest, ...changed() })
  void syncAfterWrite()
}
