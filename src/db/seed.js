import { db } from './index'
import { createPlaceholderPhoto } from '../utils/placeholderPhoto'
import { getToday } from '../utils/format'

/** StrictMode 등에서 동시 호출 시 중복 시드 방지 */
let seedPromise = null

export function seedIfEmpty() {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null
      throw err
    })
  }
  return seedPromise
}

async function runSeed() {
  const shopCount = await db.shops.count()
  if (shopCount > 0) return

  const today = getToday()
  const yesterday = offsetDate(today, -1)
  const twoDaysAgo = offsetDate(today, -2)
  const now = Date.now()

  const shopIds = await db.shops.bulkAdd(
    [
      {
        name: '미소옷장',
        building: '청평화',
        floor: '3F',
        unit: 'A-123',
        phone: '010-1234-5678',
        memo: '최소 3장부터, 현금 선결제',
        lastVisitedAt: now - 1000 * 60 * 30,
      },
      {
        name: '핑크걸',
        building: 'APM',
        floor: '2F',
        unit: 'B-045',
        phone: '010-2345-6789',
        memo: '단골 할인 5%',
        lastVisitedAt: now - 1000 * 60 * 90,
      },
      {
        name: '어반스타일',
        building: '디오트',
        floor: '4F',
        unit: 'C-210',
        phone: '',
        memo: '신상 위주, 반품 불가',
        lastVisitedAt: now - 1000 * 60 * 60 * 5,
      },
      {
        name: '루나샵',
        building: '청평화',
        floor: '2F',
        unit: 'A-088',
        phone: '010-3456-7890',
        memo: '',
        lastVisitedAt: now - 1000 * 60 * 60 * 24,
      },
      {
        name: '데일리룩',
        building: 'APM',
        floor: '3F',
        unit: 'B-112',
        phone: '010-4567-8901',
        memo: '카드 가능',
        lastVisitedAt: now - 1000 * 60 * 60 * 48,
      },
    ],
    { allKeys: true },
  )

  const [shop1, shop2, shop3, shop4, shop5] = shopIds

  const itemIds = await db.items.bulkAdd(
    [
      {
        shopId: shop1,
        date: today,
        name: '오버핏 니트',
        category: '상의',
        color: '베이지',
        size: 'FREE',
        price: 15000,
        qty: 5,
        memo: '봄 메인 후보',
        status: '구매',
        payment: '현금',
        createdAt: now - 1000 * 60 * 10,
      },
      {
        shopId: shop2,
        date: today,
        name: '플리츠 스커트',
        category: '하의',
        color: '블랙',
        size: 'M',
        price: 12000,
        qty: 3,
        memo: '단가 협의 완료',
        status: '검토',
        createdAt: now - 1000 * 60 * 25,
      },
      {
        shopId: shop1,
        date: today,
        name: '울 코트',
        category: '아우터',
        color: '차콜',
        size: 'L',
        price: 45000,
        qty: 2,
        memo: '',
        status: '구매',
        payment: '외상',
        createdAt: now - 1000 * 60 * 45,
      },
      {
        shopId: shop3,
        date: today,
        name: '크롭 자켓',
        category: '아우터',
        color: '아이보리',
        size: 'S',
        price: 28000,
        qty: 1,
        memo: '샘플 확인 필요',
        status: '보류',
        createdAt: now - 1000 * 60 * 60,
      },
      {
        shopId: shop4,
        date: yesterday,
        name: '기본 티셔츠',
        category: '상의',
        color: '화이트',
        size: 'FREE',
        price: 8000,
        qty: 10,
        memo: '기본 재고',
        status: '구매',
        payment: '카드',
        createdAt: now - 1000 * 60 * 60 * 26,
      },
      {
        shopId: shop5,
        date: yesterday,
        name: '와이드 슬랙스',
        category: '하의',
        color: '그레이',
        size: 'M',
        price: 18000,
        qty: 4,
        memo: '',
        status: '구매',
        payment: '외상',
        settled: 1,
        createdAt: now - 1000 * 60 * 60 * 28,
      },
      {
        shopId: shop2,
        date: twoDaysAgo,
        name: '레이스 블라우스',
        category: '상의',
        color: '핑크',
        size: 'S',
        price: 22000,
        qty: 2,
        memo: '',
        status: '검토',
        createdAt: now - 1000 * 60 * 60 * 50,
      },
      {
        shopId: shop3,
        date: twoDaysAgo,
        name: '데님 팬츠',
        category: '하의',
        color: '인디고',
        size: 'M',
        price: 25000,
        qty: 3,
        memo: '재입고 예정',
        status: '보류',
        createdAt: now - 1000 * 60 * 60 * 52,
      },
    ],
    { allKeys: true },
  )

  // 기록 순서대로: 오버핏 니트·플리츠 스커트·울 코트·크롭 자켓·기본 티셔츠·와이드 슬랙스·레이스 블라우스·데님 팬츠
  const photoLooks = [
    ['knit', '#d9c4a3'],
    ['skirt', '#2f3033'],
    ['coat', '#4b4f56'],
    ['jacket', '#ece4d2'],
    ['tee', '#f6f6f3'],
    ['slacks', '#9a9ea5'],
    ['blouse', '#f1bccb'],
    ['denim', '#34466b'],
  ]

  const photos = await Promise.all(
    itemIds.map((itemId, i) =>
      createPlaceholderPhoto(...photoLooks[i % photoLooks.length]).then((blob) => ({
        itemId,
        blob,
      })),
    ),
  )

  await db.photos.bulkAdd(photos)
}

function offsetDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const ny = date.getFullYear()
  const nm = String(date.getMonth() + 1).padStart(2, '0')
  const nd = String(date.getDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}
