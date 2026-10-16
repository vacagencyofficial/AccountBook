import { useMemo, useState } from 'react'
import { db } from '../db'
import { createShop } from '../db/mutations'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { getLastShopId } from '../utils/lastShop'

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
    <div className="space-y-2">
      {recentShops.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {recentShops.map((shop) => (
            <button
              key={shop.id}
              type="button"
              onClick={() => onSelect(shop.id)}
              className={[
                'shrink-0 border px-3 py-2 text-[13px]',
                selectedShopId === shop.id
                  ? 'border-ink bg-ink font-semibold text-white'
                  : 'border-line text-ink',
              ].join(' ')}
            >
              <span className="font-semibold">{shop.name}</span>
              {shop.building && <span className="ml-1 text-[11px] opacity-70">{shop.building}</span>}
            </button>
          ))}
        </div>
      )}

      {!showSearch ? (
        <button type="button" onClick={() => setShowSearch(true)} className="text-[12px] text-ink-muted">
          + 다른 가게 검색 / 추가
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
            placeholder="가게 검색"
            autoFocus
            className="w-full border border-line px-3 py-2.5 text-[13px] outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => {
              setShowSearch(false)
              setSearch('')
              setShowNewShop(false)
            }}
            className="text-[12px] text-ink-muted"
          >
            검색 닫기
          </button>
        </div>
      )}

      {search && filteredShops.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
                'border px-3 py-2 text-[13px]',
                selectedShopId === shop.id ? 'border-ink bg-ink text-white' : 'border-line text-ink',
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
          className="w-full border border-dashed border-ink px-3 py-2.5 text-[13px] font-medium text-ink"
        >
          + &quot;{search.trim()}&quot; 새 가게로 추가
        </button>
      )}

      {showNewShop && (
        <div className="space-y-2 border border-line bg-wash p-3">
          <input
            type="text"
            value={newShop.name}
            onChange={(e) => setNewShop((s) => ({ ...s, name: e.target.value }))}
            placeholder="가게명 *"
            className="w-full border border-line bg-paper px-3 py-2 text-[13px] outline-none focus:border-ink"
          />
          <input
            type="text"
            value={newShop.building}
            onChange={(e) => setNewShop((s) => ({ ...s, building: e.target.value }))}
            placeholder="상가명"
            className="w-full border border-line bg-paper px-3 py-2 text-[13px] outline-none focus:border-ink"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowNewShop(false)}
              className="flex-1 border border-line py-2 text-[13px] text-ink-muted"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!newShop.name.trim() || isCreating}
              onClick={handleCreateShop}
              className="flex-1 bg-ink py-2 text-[13px] font-medium text-white disabled:opacity-50"
            >
              {isCreating ? '추가 중…' : '추가'}
            </button>
          </div>
        </div>
      )}

      {selectedShop && (
        <p className="text-[12px] font-medium text-ink">
          선택: {selectedShop.name}
          {selectedShop.building ? ` · ${selectedShop.building}` : ''}
        </p>
      )}
    </div>
  )
}
