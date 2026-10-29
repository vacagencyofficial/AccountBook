import Dexie from 'dexie'

export const db = new Dexie('sailp')

db.version(1).stores({
  shops: '++id, name, building, lastVisitedAt',
  items: '++id, shopId, date, name, createdAt',
  photos: '++id, itemId',
})

db.version(2)
  .stores({
    shops: '++id, name, building, lastVisitedAt',
    items: '++id, shopId, date, name, category, status, createdAt',
    photos: '++id, itemId',
  })
  .upgrade(async (tx) => {
    await tx
      .table('items')
      .toCollection()
      .modify((item) => {
        if (!item.category) item.category = '기타'
        if (!item.status) item.status = '구매'
      })
  })

db.version(3).stores({
  shops: '++id, name, building, lastVisitedAt, cloudId',
  items: '++id, shopId, date, name, category, status, createdAt, cloudId',
  photos: '++id, itemId, cloudId',
})

// 동기화용: dirty(1=올려야 함), updatedAt(마지막 수정 시각), deletions(다른 폰에 알릴 삭제)
db.version(4)
  .stores({
    shops: '++id, name, building, lastVisitedAt, cloudId, dirty',
    items: '++id, shopId, date, name, category, status, createdAt, cloudId, dirty',
    photos: '++id, itemId, cloudId',
    deletions: '++id, kind, cloudId',
  })
  .upgrade(async (tx) => {
    await tx
      .table('shops')
      .toCollection()
      .modify((shop) => {
        shop.dirty = 1
        shop.updatedAt = shop.updatedAt || shop.lastVisitedAt || 1
      })
    await tx
      .table('items')
      .toCollection()
      .modify((item) => {
        item.dirty = 1
        item.updatedAt = item.updatedAt || item.createdAt || 1
      })
    // 예전 방식으로 이미 올라갔을 수 있는 사진: 다음 동기화 때 클라우드 사진과 짝지어 중복 업로드를 막음
    await tx
      .table('photos')
      .toCollection()
      .modify((photo) => {
        if (!photo.cloudId) photo.legacy = 1
      })
  })

export const CATEGORIES = ['상의', '하의', '아우터', '원피스', '잡화', '기타']
export const STATUSES = ['구매', '검토', '보류']
// 어떻게 냈는지. 빈 값은 안 적음
export const PAYMENTS = ['현금', '카드', '계좌이체', '외상']
