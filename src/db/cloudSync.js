import { supabase, isCloudConfigured } from '../lib/supabase'
import {
  getWorkspaceCode,
  getWorkspaceId,
  normalizeWorkspaceCode,
  setWorkspaceLocal,
} from '../lib/workspace'
import { markSyncFailed, markSyncSucceeded } from '../lib/syncStatus'
import { db } from './index'

const NOT_FOUND_MESSAGE =
  '이 번호의 장부를 찾을 수 없어요. 번호가 바뀌었다면 같이 쓰는 분께 새 초대 주소를 받아 주세요.'

/** 서버 함수 호출 (표 직접 접근은 secure.sql로 막혀 있음) */
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    if (error.message?.includes('workspace_not_found')) throw new Error(NOT_FOUND_MESSAGE)
    if (/failed to fetch|network|load failed/i.test(error.message ?? '')) {
      throw new Error('인터넷에 연결되지 않았어요. 연결을 확인한 뒤 다시 눌러 주세요.')
    }
    if (error.code === 'PGRST202') {
      throw new Error('클라우드 보안 설정(secure.sql)이 아직 적용되지 않았어요.')
    }
    throw error
  }
  return data
}

/** 동기화 작업은 한 번에 하나씩 (동시에 돌면 같은 기록이 두 번 올라갈 수 있음) */
let queue = Promise.resolve()
function serialized(task) {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

function assertConfigured() {
  if (!isCloudConfigured || !supabase) {
    throw new Error('클라우드가 설정되지 않았습니다')
  }
}

async function openOrCreateWorkspace(codeInput) {
  assertConfigured()
  const code = normalizeWorkspaceCode(codeInput || getWorkspaceCode())

  if (code) {
    const existing = await rpc('sailp_open_workspace', { p_code: code })
    if (!existing) throw new Error(NOT_FOUND_MESSAGE)
    return existing
  }

  // 번호는 서버가 만듦 (추측하기 어려운 10자리)
  return rpc('sailp_create_workspace')
}

async function ensureWorkspace() {
  const workspace = await openOrCreateWorkspace()
  setWorkspaceLocal({ code: workspace.code, id: workspace.id })
  return workspace
}

/** 다른 장부로 옮길 때: 이 폰 기록을 새 장부에 새로 올리도록 클라우드 연결 표시를 지움 */
async function resetCloudLinks() {
  const now = Date.now()
  await db.transaction('rw', db.shops, db.items, db.photos, db.deletions, async () => {
    await db.shops.toCollection().modify((shop) => {
      delete shop.cloudId
      shop.dirty = 1
      shop.updatedAt = now
    })
    await db.items.toCollection().modify((item) => {
      delete item.cloudId
      item.dirty = 1
      item.updatedAt = now
    })
    await db.photos.toCollection().modify((photo) => {
      delete photo.cloudId
      delete photo.storagePath
      delete photo.legacy
    })
    await db.deletions.clear()
  })
}

async function clearLocal() {
  await db.transaction('rw', db.shops, db.items, db.photos, db.deletions, async () => {
    await db.photos.clear()
    await db.items.clear()
    await db.shops.clear()
    await db.deletions.clear()
  })
}

export async function hasLocalRecords() {
  return (await db.items.count()) > 0 || (await db.shops.count()) > 0
}

/**
 * 장부 번호로 연결 (번호가 없으면 새 장부)
 * @param {'keep' | 'discard'} options.localMode 다른 장부로 옮길 때 이 폰 기록을 가져갈지(keep) 지울지(discard)
 */
export function connectWorkspace(code, { localMode = 'keep' } = {}) {
  return serialized(async () => {
    const previous = getWorkspaceCode()
    const workspace = await openOrCreateWorkspace(code)

    if (workspace.code !== previous) {
      if (localMode === 'discard') await clearLocal()
      else if (previous) await resetCloudLinks()
    }

    setWorkspaceLocal({ code: workspace.code, id: workspace.id })
    return workspace
  })
}

export async function getCloudStatus() {
  return {
    configured: isCloudConfigured,
    code: getWorkspaceCode(),
    workspaceId: getWorkspaceId(),
  }
}

async function uploadPhoto(workspace, itemCloudId, photo) {
  const path = `${workspace.id}/${itemCloudId}/${Date.now()}-${photo.id}.jpg`
  const { error } = await supabase.storage.from('photos').upload(path, photo.blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error

  const cloudId = await rpc('sailp_add_photo', {
    p_code: workspace.code,
    p_item: itemCloudId,
    p_path: path,
  })
  await db.photos.update(photo.id, { cloudId, storagePath: path })
}

async function downloadPhotoBlob(storagePath) {
  // 목록 조회는 막혀 있으므로 공개 주소로 직접 받음
  const { data } = supabase.storage.from('photos').getPublicUrl(storagePath)
  const response = await fetch(data.publicUrl)
  if (!response.ok) throw new Error(`사진을 받지 못했습니다 (${response.status})`)
  return response.blob()
}

/** 올린 뒤, 그 사이에 또 고치지 않았으면 「올림」 표시 */
async function markPushed(table, local, cloudId) {
  await table
    .where(':id')
    .equals(local.id)
    .modify((row) => {
      row.cloudId = cloudId
      if ((row.updatedAt || 0) === (local.updatedAt || 0)) row.dirty = 0
    })
}

/** 이 폰에서 지운 것을 클라우드에 알림 */
async function pushDeletions(workspace) {
  const deletions = await db.deletions.toArray()
  for (const entry of deletions) {
    const paths = await rpc('sailp_delete', { p_code: workspace.code, p_kind: entry.kind, p_id: entry.cloudId })
    await db.deletions.delete(entry.id)
    if (paths?.length) {
      // 지운 사진 파일도 저장소에서 정리 (실패해도 기록 동기화에는 영향 없음)
      try {
        await supabase.storage.from('photos').remove(paths)
      } catch (err) {
        console.warn('[photo cleanup]', err)
      }
    }
  }
}

/** 이 폰에서 새로 만들거나 고친 것만 올림 */
async function pushChanges(workspace) {
  const code = workspace.code

  const shops = await db.shops.filter((shop) => !shop.cloudId || shop.dirty === 1).toArray()
  for (const shop of shops) {
    const cloudId = await rpc('sailp_upsert_shop', {
      p_code: code,
      p_id: shop.cloudId || null,
      p_data: {
        name: shop.name,
        building: shop.building || '',
        floor: shop.floor || '',
        unit: shop.unit || '',
        phone: shop.phone || '',
        memo: shop.memo || '',
        last_visited_at: shop.lastVisitedAt || Date.now(),
        hidden: Boolean(shop.hidden),
        client_updated_at: shop.updatedAt || 0,
      },
    })
    await markPushed(db.shops, shop, cloudId)
  }

  const shopCloudMap = {}
  for (const shop of await db.shops.toArray()) shopCloudMap[shop.id] = shop.cloudId

  const items = await db.items.filter((item) => !item.cloudId || item.dirty === 1).toArray()
  for (const item of items) {
    const cloudId = await rpc('sailp_upsert_item', {
      p_code: code,
      p_id: item.cloudId || null,
      p_data: {
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
        starred: Boolean(item.starred),
        payment: item.payment || '',
        settled: Boolean(item.settled),
        created_at: item.createdAt || Date.now(),
        client_updated_at: item.updatedAt || 0,
      },
    })
    await markPushed(db.items, item, cloudId)
  }

  await pushPhotos(workspace)
}

/** 아직 안 올라간 사진만 올림 (사진마다 확인하므로 여러 장도 모두 올라감) */
async function pushPhotos(workspace) {
  const photos = await db.photos.filter((photo) => !photo.cloudId && !photo.legacy && photo.blob).toArray()
  for (const photo of photos) {
    const item = await db.items.get(photo.itemId)
    if (!item?.cloudId) continue
    await uploadPhoto(workspace, item.cloudId, photo)
  }
}

/**
 * 예전 방식으로 올라간 사진 짝짓기: 클라우드에 같은 기록의 사진이 있으면 순서대로 연결하고,
 * 남는 이 폰 사진은 새로 올리도록 표시
 */
async function linkLegacyPhotos(remote) {
  const legacy = await db.photos.filter((photo) => photo.legacy === 1 && !photo.cloudId).toArray()
  if (legacy.length === 0) return

  const linked = new Set((await db.photos.toArray()).map((photo) => photo.cloudId).filter(Boolean))
  const remoteByItem = {}
  for (const row of remote.photos ?? []) {
    if (linked.has(row.id)) continue
    ;(remoteByItem[row.item_id] ??= []).push(row)
  }

  for (const photo of legacy) {
    const item = await db.items.get(photo.itemId)
    const candidates = (item?.cloudId && remoteByItem[item.cloudId]) || []
    const match = candidates.shift()
    if (match) {
      await db.photos.update(photo.id, { cloudId: match.id, storagePath: match.storage_path, legacy: 0 })
    } else {
      await db.photos.update(photo.id, { legacy: 0 })
    }
  }
}

/** 클라우드 내용을 이 폰에 반영 (더 최근에 고친 쪽이 이김, 다른 폰에서 지운 것은 지움) */
async function applyRemote(remote) {
  const deleted = remote.deleted ?? {}
  const pendingDeletes = new Set((await db.deletions.toArray()).map((entry) => entry.cloudId))

  await db.transaction('rw', db.shops, db.items, db.photos, async () => {
    for (const cloudId of deleted.photos ?? []) {
      await db.photos.where('cloudId').equals(cloudId).delete()
    }
    for (const cloudId of deleted.items ?? []) {
      const local = await db.items.where('cloudId').equals(cloudId).first()
      if (!local) continue
      await db.photos.where('itemId').equals(local.id).delete()
      await db.items.delete(local.id)
    }
    for (const cloudId of deleted.shops ?? []) {
      await db.shops.where('cloudId').equals(cloudId).delete()
    }

    for (const row of remote.shops ?? []) {
      if (pendingDeletes.has(row.id)) continue
      const remoteTs = Number(row.client_updated_at) || 0
      const fields = {
        cloudId: row.id,
        name: row.name,
        building: row.building || '',
        floor: row.floor || '',
        unit: row.unit || '',
        phone: row.phone || '',
        memo: row.memo || '',
        lastVisitedAt: Number(row.last_visited_at) || Date.now(),
        hidden: row.hidden ? 1 : 0,
        dirty: 0,
        updatedAt: remoteTs,
      }
      const local = await db.shops.where('cloudId').equals(row.id).first()
      if (!local) await db.shops.add(fields)
      else if (remoteTs > (local.updatedAt || 0)) await db.shops.update(local.id, fields)
    }

    const shopIdMap = {}
    for (const shop of await db.shops.toArray()) {
      if (shop.cloudId) shopIdMap[shop.cloudId] = shop.id
    }

    for (const row of remote.items ?? []) {
      if (pendingDeletes.has(row.id)) continue
      const localShopId = shopIdMap[row.shop_id]
      if (!localShopId) continue
      const remoteTs = Number(row.client_updated_at) || 0
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
        starred: row.starred ? 1 : 0,
        payment: row.payment || '',
        settled: row.settled ? 1 : 0,
        createdAt: Number(row.created_at) || Date.now(),
        dirty: 0,
        updatedAt: remoteTs,
      }
      const local = await db.items.where('cloudId').equals(row.id).first()
      if (!local) await db.items.add(fields)
      else if (remoteTs > (local.updatedAt || 0)) await db.items.update(local.id, fields)
    }
  })

  // 사진은 받는 데 시간이 걸려 따로 처리 (사진마다 확인 → 여러 장도 모두 받음)
  for (const row of remote.photos ?? []) {
    if (pendingDeletes.has(row.id)) continue
    if (await db.photos.where('cloudId').equals(row.id).first()) continue
    const localItem = await db.items.where('cloudId').equals(row.item_id).first()
    if (!localItem) continue
    try {
      const blob = await downloadPhotoBlob(row.storage_path)
      await db.photos.add({
        itemId: localItem.id,
        blob,
        cloudId: row.id,
        storagePath: row.storage_path,
      })
    } catch {
      // skip broken photos
    }
  }
}

/** 장부 번호를 새 10자리로 바꿈 (옛 번호는 더 이상 열리지 않음) */
export function rotateWorkspaceCode() {
  return serialized(async () => {
    const workspace = await ensureWorkspace()
    const next = await rpc('sailp_rotate_code', { p_code: workspace.code })
    setWorkspaceLocal({ code: next.code, id: next.id })
    return next
  })
}

/** 이 폰 → 클라우드 (바뀐 것만) */
export function pushLocalToCloud() {
  if (!isCloudConfigured || !supabase) return Promise.resolve({ skipped: true })
  return serialized(async () => {
    const workspace = await ensureWorkspace()
    await pushDeletions(workspace)
    await pushChanges(workspace)
    markSyncSucceeded()
    return { ok: true, workspace }
  })
}

/** 클라우드 → 이 폰. replaceLocal이면 받기에 성공한 뒤 이 폰 기록을 클라우드 내용으로 바꿈 */
export function pullCloudToLocal({ replaceLocal = false } = {}) {
  if (!isCloudConfigured || !supabase) return Promise.resolve({ skipped: true })
  return serialized(async () => {
    const workspace = await ensureWorkspace()
    const remote = await rpc('sailp_pull', { p_code: workspace.code })
    if (replaceLocal) await clearLocal()
    await applyRemote(remote)
    return {
      ok: true,
      workspace,
      shops: remote.shops?.length ?? 0,
      items: remote.items?.length ?? 0,
    }
  })
}

/** 양쪽 맞추기: 지운 것·바꾼 것 올리기 → 최신 내용 받기 */
export function syncBidirectional() {
  if (!isCloudConfigured) return Promise.resolve({ skipped: true, reason: 'not_configured' })
  return serialized(async () => {
    const workspace = await ensureWorkspace()
    await pushDeletions(workspace)
    await pushChanges(workspace)
    const remote = await rpc('sailp_pull', { p_code: workspace.code })
    await linkLegacyPhotos(remote)
    await pushPhotos(workspace)
    await applyRemote(remote)
    markSyncSucceeded()
    return { ok: true, workspace }
  })
}

/** 저장 직후 백그라운드 동기화 (실패해도 로컬은 유지) */
export async function syncAfterWrite() {
  if (!isCloudConfigured) return
  try {
    await pushLocalToCloud()
  } catch (err) {
    // 이 폰에는 저장됐고, 다음에 맞출 때 다시 올라감. 설정 화면에 「맞추지 못했어요」로 알림
    markSyncFailed()
    console.warn('[cloud sync]', err)
  }
}
