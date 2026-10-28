import { useMemo, useState } from 'react'
import { db } from '../db'
import { createShop } from '../db/mutations'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { getLastShopId } from '../utils/lastShop'
import { IconPlus } from './Icons'

export default function ShopChipSelector({ selectedShopId, onSelect }) {
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [building, setBuilding] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState(null)

  const { data: shops, isLoading } = useLiveQuery(
    () => db.shops.orderBy('lastVisitedAt').reverse().toArray(),
    [],
  )

  // 숨긴 가게는 고르기에서 뺌 (지금 골라 둔 가게는 예외)
  const visibleShops = useMemo(
    () => (shops ?? []).filter((shop) => !shop.hidden || shop.id === selectedShopId),
    [shops, selectedShopId],
  )

  // 최근 가게 6곳 (마지막에 고른 가게·지금 고른 가게를 앞에)
  const recentShops = useMemo(() => {
    const front = [selectedShopId, getLastShopId()].filter(Boolean)
    const picked = front.map((id) => visibleShops.find((s) => s.id === id)).filter(Boolean)
    const rest = visibleShops.filter((s) => !front.includes(s.id))
    return [...new Map([...picked, ...rest].map((s) => [s.id, s])).values()].slice(0, 6)
  }, [visibleShops, selectedShopId])

  const query = search.trim()
  const filteredShops = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return []
    return visibleShops.filter(
      (shop) => shop.name.toLowerCase().includes(q) || shop.building?.toLowerCase().includes(q),
    )
  }, [visibleShops, query])
  const exactMatch = filteredShops.some((shop) => shop.name === query)
  const noShops = !isLoading && visibleShops.length === 0
  const showPanel = panelOpen || noShops

  function closePanel() {
    setPanelOpen(false)
    setSearch('')
    setBuilding('')
    setError(null)
  }

  function pick(shopId) {
    onSelect(shopId)
    closePanel()
  }

  async function handleCreateShop() {
    if (!query) return
    setIsCreating(true)
    setError(null)
    try {
      const id = await createShop({ name: query, building })
      pick(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '가게를 추가하지 못했어요. 다시 눌러 주세요.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="label mb-0">어느 가게예요?</p>
        {!noShops && (
          <button
            type="button"
            onClick={() => (panelOpen ? closePanel() : setPanelOpen(true))}
            className="flex min-h-[2.75rem] items-center gap-1 px-1 text-[17px] font-bold text-brand"
            aria-expanded={panelOpen}
          >
            {panelOpen ? (
              '닫기'
            ) : (
              <>
                <IconPlus className="h-5 w-5" />
                다른 가게
              </>
            )}
          </button>
        )}
      </div>

      {recentShops.length > 0 && !panelOpen && (
        <div className="flex flex-wrap gap-2">
          {recentShops.map((shop) => (
            <button
              key={shop.id}
              type="button"
              onClick={() => onSelect(shop.id)}
              className={`chip ${selectedShopId === shop.id ? 'chip-on' : ''}`}
              aria-pressed={selectedShopId === shop.id}
            >
              {selectedShopId === shop.id && '✓ '}
              {shop.name}
              {shop.building && <span className="text-[16px] font-semibold opacity-75">{shop.building}</span>}
            </button>
          ))}
        </div>
      )}

      {showPanel && (
        <div className="card space-y-3 p-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={noShops ? '가게 이름을 적어 주세요' : '가게 이름으로 찾기'}
            autoFocus={!noShops}
            className="field"
            aria-label="가게 이름"
          />

          {filteredShops.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filteredShops.map((shop) => (
                <button key={shop.id} type="button" onClick={() => pick(shop.id)} className="chip">
                  {shop.name}
                  {shop.building && <span className="text-[16px] font-semibold opacity-75">{shop.building}</span>}
                </button>
              ))}
            </div>
          )}

          {query && !exactMatch && (
            <div className="space-y-2 rounded-[10px] bg-good-soft p-3">
              <p className="text-[17px] font-bold text-good">「{query}」 새 가게로 추가</p>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="상가 이름 (없어도 돼요)"
                className="field"
                aria-label="상가 이름"
              />
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateShop}
                className="btn w-full bg-good text-white"
              >
                {isCreating ? '추가하는 중…' : '이 가게 추가하고 고르기'}
              </button>
            </div>
          )}

          {error && (
            <p className="text-[16px] font-bold text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
