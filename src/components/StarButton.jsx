import { setItemStarred } from '../db/mutations'

/** 별표 켜고 끄기. 목록·사진 칸 안에 있어도 그 기록으로 넘어가지 않게 막음 */
export default function StarButton({ item, className = '', label = false }) {
  const on = Boolean(item.starred)

  function toggle(event) {
    event.preventDefault()
    event.stopPropagation()
    void setItemStarred(item.id, !on)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? '별표 빼기' : '별표 하기'}
      className={`inline-flex items-center justify-center gap-1 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path
          d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
          fill={on ? '#f59e0b' : 'none'}
          stroke={on ? '#f59e0b' : 'currentColor'}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {label && <span>{on ? '별표함' : '별표'}</span>}
    </button>
  )
}
