import { db } from '../db'
import { getWorkspaceCode } from './workspace'

// Supabase 무료 요금제 사진 저장 공간(1GB). 같이 쓰는 폰들의 사진이 모두 여기에 쌓임
export const CLOUD_PHOTO_LIMIT = 1024 * 1024 * 1024
// 이만큼 차면 「거의 찼어요」
export const NEARLY_FULL = 0.85

/** 이 폰에 있는 사진 크기 합계와 장수 */
export async function getPhotoUsage() {
  let bytes = 0
  let count = 0
  await db.photos.each((photo) => {
    if (photo.blob) {
      bytes += photo.blob.size || 0
      count += 1
    }
  })
  return { bytes, count }
}

/**
 * 저장 공간 상태. 폰 저장 공간(브라우저가 이 앱에 준 몫)과,
 * 같이 쓰기를 하면 클라우드 무료 공간 중 큰 쪽 비율로 판단
 */
export async function getStorageStatus() {
  const photos = await getPhotoUsage()
  let device = null
  try {
    const estimate = await navigator.storage?.estimate?.()
    if (estimate?.quota) device = { usage: estimate.usage || 0, quota: estimate.quota }
  } catch {
    // 확인할 수 없는 브라우저
  }
  const cloud = getWorkspaceCode() ? { usage: photos.bytes, quota: CLOUD_PHOTO_LIMIT } : null
  const ratios = [device, cloud].filter(Boolean).map((s) => s.usage / s.quota)
  const ratio = ratios.length ? Math.max(...ratios) : 0
  return { photos, device, cloud, ratio, nearlyFull: ratio >= NEARLY_FULL }
}

/** 이 날짜(YYYY-MM-DD)보다 먼저 산 상품의 사진들 */
export async function findOldPhotos(beforeDate) {
  const oldItemIds = new Set(
    (await db.items.filter((item) => (item.date || '') < beforeDate).primaryKeys()) ?? [],
  )
  const photos = await db.photos.filter((photo) => oldItemIds.has(photo.itemId)).toArray()
  return {
    ids: photos.map((photo) => photo.id),
    bytes: photos.reduce((sum, photo) => sum + (photo.blob?.size || 0), 0),
  }
}
