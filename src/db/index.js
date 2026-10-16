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

export const CATEGORIES = ['상의', '하의', '아우터', '원피스', '잡화', '기타']
export const STATUSES = ['구매', '검토', '보류']
