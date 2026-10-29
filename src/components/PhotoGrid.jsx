import { useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from './EmptyState'
import StarButton from './StarButton'
import { IconGallery } from './Icons'
import { db } from '../db'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { formatCurrency, itemTotal } from '../utils/format'

const PREF_KEY = 'sailp-gallery'

const GROUPS = {
  all: '사진만 쭉',
  shop: '가게별',
  category: '종류별',
}

const SORTS = {
  new: '최신순',
  old: '오래된순',
  price: '비싼순',
  star: '별표 먼저',
}

const SORTERS = {
  new: (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0),
  old: (a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0),
  price: (a, b) => itemTotal(b) - itemTotal(a),
  star: (a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || SORTERS.new(a, b),
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY)) || {}
  } catch {
    return {}
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
  } catch {
    // 저장이 막힌 브라우저면 이번에만 기억
  }
}

function Photo({ blob, alt }) {
  const url = useObjectUrl(blob)
  return url ? (
    <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-brand/50">
      <IconGallery className="h-8 w-8" />
    </div>
  )
}

/** 가게별·종류별 보기의 칸: 사진 + 이름 + 금액 */
function Tile({ item }) {
  return (
    <li className="relative">
      <Link to={`/items/${item.id}`} className="block">
        <div className="aspect-square overflow-hidden rounded-[12px] bg-brand-soft">
          <Photo blob={item.photo?.blob} alt={item.name || ''} />
        </div>
        <p className="mt-1 truncate text-[16px] font-bold text-ink">{item.name || '이름 없음'}</p>
        <p className="-mt-0.5 truncate text-[16px] font-semibold text-ink-soft tabular">
          {formatCurrency(itemTotal(item))}
        </p>
      </Link>
      <StarButton
        item={item}
        iconClass="h-5 w-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)]"
        className="absolute right-0 top-0 h-10 w-10 text-white"
      />
    </li>
  )
}

/** 사진만 쭉: 기록마다 모든 사진을 글자 없이 촘촘하게 */
function PhotoWall({ items }) {
  const ids = items.map((item) => item.id)
  const { data: photos } = useLiveQuery(
    () => (ids.length ? db.photos.where('itemId').anyOf(ids).sortBy('id') : []),
    [ids.join(',')],
  )
  if (!photos) return <div className="skeleton h-40" />

  const byItem = {}
  for (const photo of photos) (byItem[photo.itemId] ??= []).push(photo)
  // 사진 없는 기록(별표만 볼 때)은 빈 칸 하나로
  const cells = items.flatMap((item) =>
    byItem[item.id]?.length
      ? byItem[item.id].map((photo) => ({ item, photo, key: photo.id }))
      : [{ item, photo: null, key: `item-${item.id}` }],
  )

  return (
    <ul className="grid grid-cols-3 gap-1" aria-label="사진 모아보기">
      {cells.map(({ item, photo, key }) => (
        <li key={key} className="relative aspect-square overflow-hidden rounded-[6px] bg-brand-soft">
          <Link
            to={`/items/${item.id}`}
            className="block h-full w-full"
            aria-label={item.name || '이름 없음'}
          >
            <Photo blob={photo?.blob} alt={item.name || ''} />
          </Link>
          {item.starred ? (
            <span
              className="pointer-events-none absolute right-1.5 top-0.5 text-[16px] text-[#f59e0b] drop-shadow"
              aria-label="별표"
            >
              ★
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function groupItems(items, by) {
  const groups = new Map()
  for (const item of items) {
    const key = by === 'shop' ? item.shop?.name || '가게 정보 없음' : item.category || '기타'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return [...groups.entries()]
}

/** 한 줄 나눔 버튼 (장부의 달력·목록·사진과 같은 모양) */
function Chips({ options, value, onChange, label }) {
  const entries = Object.entries(options)
  return (
    <div
      className="grid gap-1 rounded-[12px] bg-line-soft p-1"
      style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={label}
    >
      {entries.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={`min-h-[2.5rem] rounded-[9px] text-[16px] font-bold ${
            value === key ? 'bg-paper text-brand shadow-[var(--shadow-card)]' : 'text-ink-soft'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

/**
 * 사진으로 모아 보기: 사진만 쭉 / 가게별 / 종류별, 정렬, 별표만 보기.
 * hideShopGroup: 한 가게 안에서 볼 때는 「가게별」을 뺌
 */
export default function PhotoGrid({ items, emptyTitle = '아직 사진이 없어요', hideShopGroup = false }) {
  const [prefs, setPrefs] = useState(loadPrefs)
  const groupOptions = hideShopGroup ? { all: GROUPS.all, category: GROUPS.category } : GROUPS
  const group = prefs.group in groupOptions ? prefs.group : 'all'
  const sort = prefs.sort in SORTS ? prefs.sort : 'new'
  const onlyStarred = Boolean(prefs.onlyStarred)

  function update(next) {
    const merged = { ...prefs, ...next }
    setPrefs(merged)
    savePrefs(merged)
  }

  const starredCount = items.filter((item) => item.starred).length
  // 별표만 보기는 사진 없는 기록도, 그 밖에는 사진 있는 기록만
  const shown = items.filter((item) => (onlyStarred ? item.starred : item.photo)).sort(SORTERS[sort])

  const groups = group === 'all' ? null : groupItems(shown, group)
  if (groups && sort === 'price') {
    groups.sort(
      (a, b) => b[1].reduce((s, i) => s + itemTotal(i), 0) - a[1].reduce((s, i) => s + itemTotal(i), 0),
    )
  }

  return (
    <div>
      <Chips
        label="보는 방법"
        options={groupOptions}
        value={group}
        onChange={(key) => update({ group: key })}
      />
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => update({ onlyStarred: !onlyStarred })}
          aria-pressed={onlyStarred}
          className={`flex min-h-[2.75rem] items-center gap-1.5 rounded-[10px] px-2 text-[17px] font-bold ${
            onlyStarred ? 'bg-[#fef3c7] text-[#92400e]' : 'text-ink-muted'
          }`}
        >
          <span className="text-[#f59e0b]">{onlyStarred ? '★' : '☆'}</span>
          별표만 보기 {starredCount > 0 && <span className="tabular">({starredCount})</span>}
        </button>
        <label className="flex min-h-[2.75rem] items-center gap-1 text-[17px] font-bold text-ink-muted">
          <span className="sr-only">정렬</span>
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="min-h-[2.75rem] appearance-none rounded-[10px] bg-transparent py-1 pl-2 pr-1 text-right text-[17px] font-bold text-ink"
            aria-label="정렬"
          >
            {Object.entries(SORTS).map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
          </select>
          <span aria-hidden>▾</span>
        </label>
      </div>

      <div className="mt-3">
        {shown.length === 0 ? (
          <EmptyState
            title={onlyStarred ? '별표한 물건이 없어요' : emptyTitle}
            description={
              onlyStarred
                ? '사진이나 기록에서 ☆를 누르면 여기에 모여요.'
                : '상품 입력할 때 사진을 찍으면 여기에 모여요.'
            }
          />
        ) : group === 'all' ? (
          <PhotoWall items={shown} />
        ) : (
          <div className="space-y-5">
            {groups.map(([name, groupItemsList]) => (
              <section key={name}>
                <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
                  <h3 className="truncate text-[18px] font-extrabold text-ink">
                    {name} · {groupItemsList.length}건
                  </h3>
                  <b className="shrink-0 text-[17px] font-extrabold text-brand tabular">
                    {formatCurrency(groupItemsList.reduce((sum, item) => sum + itemTotal(item), 0))}
                  </b>
                </div>
                <ul className="grid grid-cols-3 gap-x-2.5 gap-y-3" aria-label="사진 모아보기">
                  {groupItemsList.map((item) => (
                    <Tile key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
