/** 가게 입력 칸의 처음 값 */
export const emptyShop = {
  name: '',
  building: '',
  floor: '',
  unit: '',
  phone: '',
  memo: '',
}

/** 저장된 가게 → 고치기 칸 값 */
export function shopToForm(shop) {
  if (!shop) return { ...emptyShop }
  return {
    name: shop.name ?? '',
    building: shop.building ?? '',
    floor: shop.floor ?? '',
    unit: shop.unit ?? '',
    phone: shop.phone ?? '',
    memo: shop.memo ?? '',
  }
}
