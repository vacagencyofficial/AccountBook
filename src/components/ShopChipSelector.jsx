import { useMemo, useState } from 'react'
import { db } from '../db'
import { createShop } from '../db/mutations'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { getLastShopId } from '../utils/lastShop'
import { IconPlus, IconSearch } from './Icons'

export default function ShopChipSelector({ selectedShopId, onSelect }) {
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showNewShop, setShowNewShop] = useState(false)
  const [newShop, setNewShop] = useState({ name: '', building: '' })
  const [isCreating, setIsCreating] = useState(false)

  const { data: shops } = useLiveQuery(
    () => db.shops.orderBy('lastVisitedAt').reverse().toArray(),
    [],
  )

  const recentShops = useMemo(() => {
    const list = shops ?? []
    const lastId = getLastShopId()
    if (!lastId) return list.slice(0, 6)
    const last = list.find((s) => s.id === lastId)
    const rest = list.filter((s) => s.id !== lastId)
    return last ? [last, ...rest].slice(0, 6) : list.slice(0, 6)
  }, [shops])

  const filteredShops = useMemo(() => {
    if (!shops) return []
    const q = search.trim().toLowerCase()
    if (!q) return []
    return shops.filter(
      (shop) =>
        shop.name.toLowerCase().includes(q) ||
        shop.building?.toLowerCase().includes(q),
    )
  }, [shops, search])

  const showAddNew = search.trim().length > 0 && filteredShops.length === 0 && !showNewShop

  async function handleCreateShop() {
    if (!newShop.name.trim()) return
    setIsCreating(true)
    try {
      const id = await createShop(newShop)
      onSelect(id)
      setSearch('')
      setShowNewShop(false)
      setShowSearch(false)
      setNewShop({ name: '', building: '' })
    } finally {
      setIsCreating(false)
    }
  }

  function openNewShopForm() {
    setNewShop({ name: search.trim(), building: '' })
    setShowNewShop(true)
  }

  const selectedShop = shops?.find((s) => s.id === selectedShopId)

  return (
    <div className="space-y-3">
      {recentShops.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {recentShops.map((shop) => (
            <button
              key={shop.id}
              type="button"
              onClick={() => onSelect(shop.id)}
              className={[
                'tap-target shrink-0 border-2 px-4 text-[15px] font-bold',
                selectedShopId === shop.id
                  ? 'border-good bg-good text-white'
                  : 'border-line bg-wash text-ink',
              ].join(' ')}
            >
              {shop.name}
              {shop.building ? (
                <span className="ml-1 text-[12px] font-medium opacity-80">{shop.building}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {!showSearch ? (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="inline-flex items-center gap-1 text-[15px] font-bold text-brand"
        >
          <IconSearch className="h-4 w-4" />
          다른 가게 찾기 / 추가
        </button>
      ) : (
        <div className="space-y-2">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setShowNewShop(false)
            }}
            placeholder="가게 이름 검색"
            autoFocus
            className="tap-target w-full border-2 border-line bg-wash px-3 text-[16px] outline-none focus:border-brand focus:bg-paper"
          />
          <button
            type="button"
            onClick={() => {
              setShowSearch(false)
              setSearch('')
              setShowNewShop(false)
            }}
            className="text-[14px] font-bold text-ink-muted"
          >
            검색 닫기
          </button>
        </div>
      )}

      {search && filteredShops.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filteredShops.map((shop) => (
            <button
              key={shop.id}
              type="button"
              onClick={() => {
                onSelect(shop.id)
                setSearch('')
                setShowSearch(false)
              }}
              className={[
                ' border-2 px-3 py-2 text-[15px] font-bold',
                selectedShopId === shop.id
                  ? 'border-good bg-good text-white'
                  : 'border-line bg-wash text-ink',
              ].join(' ')}
            >
              {shop.name}
            </button>
          ))}
        </div>
      )}

      {showAddNew && (
        <button
          type="button"
          onClick={openNewShopForm}
          className="tap-target flex w-full items-center justify-center gap-2 border-2 border-dashed border-good bg-good-soft text-[15px] font-bold text-good"
        >
          <IconPlus className="h-5 w-5" />
          &quot;{search.trim()}&quot; 새 가게로 추가
        </button>
      )}

      {showNewShop && (
        <div className="space-y-2 border-2 border-line bg-wash p-3">
          <input
            type="text"
            value={newShop.name}
            onChange={(e) => setNewShop((s) => ({ ...s, name: e.target.value }))}
            placeholder="가게명 *"
            className="tap-target w-full border-2 border-line bg-paper px-3 text-[16px] outline-none focus:border-brand"
          />
          <input
            type="text"
            value={newShop.building}
            onChange={(e) => setNewShop((s) => ({ ...s, building: e.target.value }))}
            placeholder="상가명 (청평화, APM…)"
            className="tap-target w-full border-2 border-line bg-paper px-3 text-[16px] outline-none focus:border-brand"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowNewShop(false)}
              className="tap-target flex-1 border-2 border-line bg-paper text-[15px] font-bold text-ink-muted"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!newShop.name.trim() || isCreating}
              onClick={handleCreateShop}
              className="tap-target flex-1 bg-good text-[15px] font-bold text-white disabled:opacity-50"
            >
              {isCreating ? '추가 중…' : '추가'}
            </button>
          </div>
        </div>
      )}

      {selectedShop && (
        <p className=" bg-good-soft px-3 py-2 text-[15px] font-bold text-good">
          선택됨: {selectedShop.name}
          {selectedShop.building ? ` · ${selectedShop.building}` : ''}
        </p>
      )}
    </div>
  )
}
