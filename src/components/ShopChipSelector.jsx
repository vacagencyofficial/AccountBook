import { useMemo, useState } from 'react'
import { db } from '../db'
import { createShop } from '../db/mutations'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { getLastShopId } from '../utils/lastShop'

export default function ShopChipSelector({ selectedShopId, onSelect, compact = false }) {
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
        <div className="flex gap-2 overflow-x-auto pb-1">
          {recentShops.map((shop) => (
            <button
              key={shop.id}
              type="button"
              onClick={() => onSelect(shop.id)}
              className={chipClass(selectedShopId === shop.id, compact)}
            >
              <span className="font-semibold">{shop.name}</span>
              {shop.building && <span className="ml-1 text-xs opacity-80">{shop.building}</span>}
            </button>
          ))}
        </div>
      )}

      {!showSearch ? (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="text-xs font-medium text-ink-muted"
        >
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
            className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand focus:bg-raised focus:ring-2 focus:ring-brand/15"
          />
          <button
            type="button"
            onClick={() => {
              setShowSearch(false)
              setSearch('')
              setShowNewShop(false)
            }}
            className="text-xs text-ink-muted"
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
              className={chipClass(selectedShopId === shop.id, compact)}
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
          className="w-full rounded-xl border border-dashed border-brand bg-brand-soft px-3 py-2.5 text-sm font-medium text-brand"
        >
          + &quot;{search.trim()}&quot; 새 가게로 추가
        </button>
      )}

      {showNewShop && (
        <div className="space-y-2 rounded-xl border border-line bg-paper p-3">
          <input
            type="text"
            value={newShop.name}
            onChange={(e) => setNewShop((s) => ({ ...s, name: e.target.value }))}
            placeholder="가게명 *"
            className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            type="text"
            value={newShop.building}
            onChange={(e) => setNewShop((s) => ({ ...s, building: e.target.value }))}
            placeholder="상가명 (청평화, APM…)"
            className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowNewShop(false)}
              className="flex-1 rounded-lg border border-line bg-raised py-2 text-sm text-ink-muted"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!newShop.name.trim() || isCreating}
              onClick={handleCreateShop}
              className="flex-1 rounded-lg bg-brand py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isCreating ? '추가 중…' : '추가'}
            </button>
          </div>
        </div>
      )}

      {selectedShop && (
        <p className="text-xs font-semibold text-brand">
          선택됨 · {selectedShop.name}
          {selectedShop.building ? ` · ${selectedShop.building}` : ''}
        </p>
      )}
    </div>
  )
}

function chipClass(active, compact) {
  return [
    'shrink-0 rounded-xl transition active:scale-95',
    compact ? 'px-4 py-2.5 text-sm' : 'px-3.5 py-2 text-sm',
    active
      ? 'bg-brand text-white shadow-md shadow-brand/20'
      : 'bg-paper text-ink ring-1 ring-line hover:bg-raised',
  ].join(' ')
}
