import { supabase, isCloudConfigured } from '../lib/supabase'
import {
  getWorkspaceCode,
  getWorkspaceId,
  normalizeWorkspaceCode,
  setWorkspaceLocal,
} from '../lib/workspace'
import { db } from './index'

const NOT_FOUND_MESSAGE = '이 번호의 장부를 찾을 수 없어요. 번호를 다시 확인해 주세요.'

/** 서버 함수 호출 (표 직접 접근은 secure.sql로 막혀 있음) */
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    if (error.message?.includes('workspace_not_found')) throw new Error(NOT_FOUND_MESSAGE)
    if (error.code === 'PGRST202') {
      throw new Error('클라우드 보안 설정(secure.sql)이 아직 적용되지 않았어요.')
    }
    throw error
  }
  return data
}

async function ensureWorkspace(codeInput) {
  if (!isCloudConfigured || !supabase) {
    throw new Error('클라우드가 설정되지 않았습니다')
  }

  const code = normalizeWorkspaceCode(codeInput || getWorkspaceCode())

  if (code) {
    const existing = await rpc('sailp_open_workspace', { p_code: code })
    if (!existing) throw new Error(NOT_FOUND_MESSAGE)
    setWorkspaceLocal({ code: existing.code, id: existing.id })
    return existing
  }

  // 번호는 서버가 만듦 (추측하기 어려운 10자리)
  const created = await rpc('sailp_create_workspace')
  setWorkspaceLocal({ code: created.code, id: created.id })
  return created
}

export async function connectWorkspace(code) {
  return ensureWorkspace(code)
}

export async function getCloudStatus() {
  return {
    configured: isCloudConfigured,
    code: getWorkspaceCode(),
    workspaceId: getWorkspaceId(),
  }
}

async function uploadPhotoBlob(workspace, itemCloudId, blob, index = 0) {
  const path = `${workspace.id}/${itemCloudId}/${Date.now()}-${index}.jpg`
  const { error } = await supabase.storage.from('photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error

  await rpc('sailp_add_photo', { p_code: workspace.code, p_item: itemCloudId, p_path: path })
  return path
}

async function downloadPhotoBlob(storagePath) {
  // 목록 조회는 막혀 있으므로 공개 주소로 직접 받음
  const { data } = supabase.storage.from('photos').getPublicUrl(storagePath)
  const response = await fetch(data.publicUrl)
  if (!response.ok) throw new Error(`사진을 받지 못했습니다 (${response.status})`)
  return response.blob()
}

/** 로컬 → 클라우드 전체 푸시 */
export async function pushLocalToCloud() {
  if (!isCloudConfigured || !supabase) return { skipped: true }

  const workspace = await ensureWorkspace()
  const code = workspace.code

  const shops = await db.shops.toArray()
  const shopCloudMap = {}

  for (const shop of shops) {
    const payload = {
      name: shop.name,
      building: shop.building || '',
      floor: shop.floor || '',
      unit: shop.unit || '',
      phone: shop.phone || '',
      memo: shop.memo || '',
      last_visited_at: shop.lastVisitedAt || Date.now(),
    }

    const cloudId = await rpc('sailp_upsert_shop', {
      p_code: code,
      p_id: shop.cloudId || null,
      p_data: payload,
    })
    if (cloudId !== shop.cloudId) await db.shops.update(shop.id, { cloudId })
    shopCloudMap[shop.id] = cloudId
  }

  const items = await db.items.toArray()
  for (const item of items) {
    const payload = {
      shop_id: shopCloudMap[item.shopId] || null,
      date: item.date,
      name: item.name || '',
      category: item.category || '기타',
      color: item.color || '',
      size: item.size || '',
      price: item.price || 0,
      qty: item.qty || 1,
      memo: item.memo || '',
      status: item.status || '구매',
      created_at: item.createdAt || Date.now(),
    }

    const itemCloudId = await rpc('sailp_upsert_item', {
      p_code: code,
      p_id: item.cloudId || null,
      p_data: payload,
    })
    if (itemCloudId !== item.cloudId) await db.items.update(item.id, { cloudId: itemCloudId })

    const photos = await db.photos.where('itemId').equals(item.id).toArray()
    const cloudPhotoCount = await rpc('sailp_item_photo_count', { p_code: code, p_item: itemCloudId })

    if (cloudPhotoCount === 0) {
      for (let i = 0; i < photos.length; i += 1) {
        if (photos[i].blob) {
          await uploadPhotoBlob(workspace, itemCloudId, photos[i].blob, i)
        }
      }
    }
  }

  return { ok: true, workspace }
}

/** 클라우드 → 로컬 풀 */
export async function pullCloudToLocal({ replaceLocal = false } = {}) {
  if (!isCloudConfigured || !supabase) return { skipped: true }

  const workspace = await ensureWorkspace()
  // 먼저 받아 두고 나서 로컬을 비움 (받기 실패 시 기존 장부 유지)
  const remote = await rpc('sailp_pull', { p_code: workspace.code })
  const cloudShops = remote?.shops ?? []
  const cloudItems = remote?.items ?? []
  const cloudPhotos = remote?.photos ?? []

  if (replaceLocal) {
    await db.transaction('rw', db.shops, db.items, db.photos, async () => {
      await db.photos.clear()
      await db.items.clear()
      await db.shops.clear()
    })
  }

  const shopIdMap = {}
  for (const row of cloudShops) {
    const existing = await db.shops.filter((s) => s.cloudId === row.id).first()
    const fields = {
      cloudId: row.id,
      name: row.name,
      building: row.building || '',
      floor: row.floor || '',
      unit: row.unit || '',
      phone: row.phone || '',
      memo: row.memo || '',
      lastVisitedAt: Number(row.last_visited_at) || Date.now(),
    }
    if (existing) {
      await db.shops.update(existing.id, fields)
      shopIdMap[row.id] = existing.id
    } else {
      const localId = await db.shops.add(fields)
      shopIdMap[row.id] = localId
    }
  }

  const itemIdMap = {}
  for (const row of cloudItems) {
    const localShopId = shopIdMap[row.shop_id]
    if (!localShopId) continue

    const existing = await db.items.filter((i) => i.cloudId === row.id).first()
    const fields = {
      cloudId: row.id,
      shopId: localShopId,
      date: row.date,
      name: row.name || '',
      category: row.category || '기타',
      color: row.color || '',
      size: row.size || '',
      price: Number(row.price) || 0,
      qty: Number(row.qty) || 1,
      memo: row.memo || '',
      status: row.status || '구매',
      createdAt: Number(row.created_at) || Date.now(),
    }
    if (existing) {
      await db.items.update(existing.id, fields)
      itemIdMap[row.id] = existing.id
    } else {
      const localId = await db.items.add(fields)
      itemIdMap[row.id] = localId
    }
  }

  for (const row of cloudPhotos) {
    const localItemId = itemIdMap[row.item_id]
    if (!localItemId) continue

    const already = await db.photos.filter((p) => p.cloudId === row.id).first()
    if (already) continue

    const count = await db.photos.where('itemId').equals(localItemId).count()
    if (count > 0 && !replaceLocal) continue

    try {
      const blob = await downloadPhotoBlob(row.storage_path)
      await db.photos.add({
        itemId: localItemId,
        blob,
        cloudId: row.id,
        storagePath: row.storage_path,
      })
    } catch {
      // skip broken photos
    }
  }

  return {
    ok: true,
    workspace,
    shops: cloudShops.length,
    items: cloudItems.length,
  }
}

export async function syncBidirectional() {
  if (!isCloudConfigured) return { skipped: true, reason: 'not_configured' }
  const push = await pushLocalToCloud()
  const pull = await pullCloudToLocal({ replaceLocal: false })
  return { ok: true, push, pull }
}

/** 저장 직후 백그라운드 동기화 (실패해도 로컬은 유지) */
export async function syncAfterWrite() {
  if (!isCloudConfigured) return
  try {
    await pushLocalToCloud()
  } catch (err) {
    console.warn('[cloud sync]', err)
  }
}
