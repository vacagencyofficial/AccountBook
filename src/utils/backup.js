import JSZip from 'jszip'
import { db } from '../db'
import { getToday } from './format'

const BACKUP_VERSION = 1

export async function exportBackup() {
  const [shops, items, photos] = await Promise.all([
    db.shops.toArray(),
    db.items.toArray(),
    db.photos.toArray(),
  ])

  const zip = new JSZip()
  const photoEntries = []

  for (const photo of photos) {
    const filename = `photos/${photo.id}.jpg`
    if (photo.blob) {
      zip.file(filename, photo.blob)
    }
    photoEntries.push({
      id: photo.id,
      itemId: photo.itemId,
      file: filename,
    })
  }

  const data = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    shops,
    items,
    photos: photoEntries,
  }

  zip.file('data.json', JSON.stringify(data, null, 2))

  const buffer = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  downloadBlob(buffer, `사입노트_백업_${getToday()}.zip`)
}

/**
 * @param {File} file
 * @param {'overwrite' | 'merge'} mode
 */
export async function importBackup(file, mode) {
  const zip = await JSZip.loadAsync(file)
  const dataFile = zip.file('data.json')

  if (!dataFile) {
    throw new Error('유효하지 않은 백업 파일입니다 (data.json 없음)')
  }

  const raw = await dataFile.async('string')
  const data = JSON.parse(raw)

  if (!data.shops || !data.items || !data.photos) {
    throw new Error('유효하지 않은 백업 형식입니다')
  }

  if (mode === 'overwrite') {
    await importOverwrite(zip, data)
  } else {
    await importMerge(zip, data)
  }
}

async function importOverwrite(zip, data) {
  await db.transaction('rw', [db.shops, db.items, db.photos], async () => {
    await db.shops.clear()
    await db.items.clear()
    await db.photos.clear()

    if (data.shops.length) await db.shops.bulkPut(data.shops)
    if (data.items.length) await db.items.bulkPut(data.items)

    for (const entry of data.photos) {
      const blob = await readPhotoBlob(zip, entry)
      if (blob) {
        await db.photos.put({ id: entry.id, itemId: entry.itemId, blob })
      }
    }
  })
}

async function importMerge(zip, data) {
  const shopIdMap = {}
  const itemIdMap = {}

  await db.transaction('rw', [db.shops, db.items, db.photos], async () => {
    for (const shop of data.shops) {
      const { id: oldId, ...shopData } = shop
      const newId = await db.shops.add(shopData)
      shopIdMap[oldId] = newId
    }

    for (const item of data.items) {
      const { id: oldId, shopId, ...itemData } = item
      const mappedShopId = shopIdMap[shopId]
      if (!mappedShopId) continue
      const newId = await db.items.add({ ...itemData, shopId: mappedShopId })
      itemIdMap[oldId] = newId
    }

    for (const entry of data.photos) {
      const mappedItemId = itemIdMap[entry.itemId]
      if (!mappedItemId) continue
      const blob = await readPhotoBlob(zip, entry)
      if (blob) {
        await db.photos.add({ itemId: mappedItemId, blob })
      }
    }
  })
}

async function readPhotoBlob(zip, entry) {
  const path = entry.file ?? `photos/${entry.id}.jpg`
  const file = zip.file(path)
  if (!file) return null
  return file.async('blob')
}

export async function deleteAllData() {
  await db.transaction('rw', [db.shops, db.items, db.photos], async () => {
    await db.photos.clear()
    await db.items.clear()
    await db.shops.clear()
  })
}

export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) {
    return { usage: null, quota: null }
  }
  const { usage, quota } = await navigator.storage.estimate()
  return { usage: usage ?? null, quota: quota ?? null }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
