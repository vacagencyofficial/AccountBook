import { useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from './EmptyState'
import StarButton from './StarButton'
import { IconGallery } from './Icons'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { formatCurrency, itemTotal } from '../utils/format'

function Tile({ item }) {
  const url = useObjectUrl(item.photo?.blob)
  return (
    <li className="relative">
      <Link to={`/items/${item.id}`} className="block">
        <div className="aspect-square overflow-hidden rounded-[12px] bg-brand-soft">
          {url ? (
            <img src={url} alt={item.name || ''} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-brand/50">
              <IconGallery className="h-8 w-8" />
            </div>
          )}
        </div>
        <p className="mt-1 truncate text-[16px] font-bold text-ink">{item.name || '이름 없음'}</p>
        <p className="-mt-0.5 truncate text-[16px] font-semibold text-ink-soft tabular">
          {formatCurrency(itemTotal(item))}
        </p>
      </Link>
      <StarButton
        item={item}
        className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full bg-black/30 text-white"
      />
    </li>
  )
}

/**
 * 사진으로 모아 보기. 「전체」는 사진 있는 기록, 「별표」는 별표한 기록 전부(사진 없어도)
 */
export default function PhotoGrid({ items, emptyTitle = '아직 사진이 없어요' }) {
  const [onlyStarred, setOnlyStarred] = useState(false)
  const withPhoto = items.filter((item) => item.photo)
  const starred = items.filter((item) => item.starred)
  const shown = onlyStarred ? starred : withPhoto

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {[
          [false, `사진 ${withPhoto.length}`],
          [true, `★ 별표 ${starred.length}`],
        ].map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setOnlyStarred(value)}
            aria-pressed={onlyStarred === value}
            className={`chip min-h-[2.75rem] ${onlyStarred === value ? 'chip-on' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={onlyStarred ? '별표한 물건이 없어요' : emptyTitle}
          description={
            onlyStarred
              ? '사진이나 기록에서 ☆를 누르면 여기에 모여요.'
              : '물건 적을 때 사진을 찍으면 여기에 모여요.'
          }
        />
      ) : (
        <ul className="grid grid-cols-3 gap-x-2.5 gap-y-3" aria-label="사진 모아보기">
          {shown.map((item) => (
            <Tile key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}
