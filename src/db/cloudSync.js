import { supabase, isCloudConfigured } from '../lib/supabase'
import {
  createLocalWorkspaceCode,
  getWorkspaceCode,
  getWorkspaceId,
  setWorkspaceLocal,
} from '../lib/workspace'
import { db } from './index'

async function ensureWorkspace(codeInput) {
  if (!isCloudConfigured || !supabase) {
    throw new Error('클라우드가 설정되지 않았습니다')
  }

  const code = (codeInput || getWorkspaceCode() || createLocalWorkspaceCode()).toUpperCase().trim()

  const existing = await supabase.from('workspaces').select('id, code').eq('code', code).maybeSingle()
  if (existing.error) throw existing.error

  if (existing.data) {
    setWorkspaceLocal({ code: existing.data.code, id: existing.data.id })
    return existing.data
  }

  const created = await supabase.from('workspaces').insert({ code }).select('id, code').single()
  if (created.error) throw created.error
  setWorkspaceLocal({ code: created.data.code, id: created.data.id })
  return created.data
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

async function uploadPhotoBlob(workspaceId, itemCloudId, blob, index = 0) {
  const path = `${workspaceId}/${itemCloudId}/${Date.now()}-${index}.jpg`
  const { error } = await supabase.storage.from('photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) throw error

  const { error: insertError } = await supabase.from('photos').insert({
    workspace_id: workspaceId,
    item_id: itemCloudId,
    storage_path: path,
  })
  if (insertError) throw insertError
  return path
}

async function downloadPhotoBlob(storagePath) {
  const { data, error } = await supabase.storage.from('photos').download(storagePath)
  if (error) throw error
  return data
}

/** 로컬 → 클라우드 전체 푸시 */
export async function pushLocalToCloud() {
  if (!isCloudConfigured || !supabase) return { skipped: true }

  const workspace = await ensureWorkspace()
  const workspaceId = workspace.id

  const shops = await db.shops.toArray()
  const shopCloudMap = {}

  for (const shop of shops) {
    const payload = {
      workspace_id: workspaceId,
      name: shop.name,
      building: shop.building || '',
      floor: shop.floor || '',
      unit: shop.unit || '',
      phone: shop.phone || '',
      memo: shop.memo || '',
      last_visited_at: shop.lastVisitedAt || Date.now(),
      updated_at: new Date().toISOString(),
    }

    if (shop.cloudId) {
      const { error } = await supabase.from('shops').update(payload).eq('id', shop.cloudId)
      if (error) throw error
      shopCloudMap[shop.id] = shop.cloudId
    } else {
      const { data, error } = await supabase.from('shops').insert(payload).select('id').single()
      if (error) throw error
      await db.shops.update(shop.id, { cloudId: data.id })
      shopCloudMap[shop.id] = data.id
    }
  }

  const items = await db.items.toArray()
  for (const item of items) {
    const payload = {
      workspace_id: workspaceId,
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
      updated_at: new Date().toISOString(),
    }

    let itemCloudId = item.cloudId
    if (itemCloudId) {
      const { error } = await supabase.from('items').update(payload).eq('id', itemCloudId)
      if (error) throw error
    } else {
      const { data, error } = await supabase.from('items').insert(payload).select('id').single()
      if (error) throw error
      itemCloudId = data.id
      await db.items.update(item.id, { cloudId: itemCloudId })
    }

    const photos = await db.photos.where('itemId').equals(item.id).toArray()
    const existingCloud = await supabase.from('photos').select('id').eq('item_id', itemCloudId)

    if (!existingCloud.error && (existingCloud.data?.length || 0) === 0) {
      for (let i = 0; i < photos.length; i += 1) {
        if (photos[i].blob) {
          await uploadPhotoBlob(workspaceId, itemCloudId, photos[i].blob, i)
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
  const workspaceId = workspace.id

  if (replaceLocal) {
    await db.transaction('rw', db.shops, db.items, db.photos, async () => {
      await db.photos.clear()
      await db.items.clear()
      await db.shops.clear()
    })
  }

  const { data: cloudShops, error: shopsError } = await supabase
    .from('shops')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
  if (shopsError) throw shopsError

  const shopIdMap = {}
  for (const row of cloudShops || []) {
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

  const { data: cloudItems, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
  if (itemsError) throw itemsError

  const itemIdMap = {}
  for (const row of cloudItems || []) {
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

  const { data: cloudPhotos, error: photosError } = await supabase
    .from('photos')
    .select('*')
    .eq('workspace_id', workspaceId)
  if (photosError) throw photosError

  for (const row of cloudPhotos || []) {
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
    shops: cloudShops?.length || 0,
    items: cloudItems?.length || 0,
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
