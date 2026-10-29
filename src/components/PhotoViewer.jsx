import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { formatCurrency, itemTotal } from '../utils/format'

function Slide({ blob, alt }) {
  const url = useObjectUrl(blob)
  if (!url) return <div className="h-full w-full" />
  return <img src={url} alt={alt} className="h-full w-full select-none object-contain" draggable={false} />
}

/**
 * 사진 크게 보기: 화면 가득, 옆으로 밀거나 ‹ › 로 넘김.
 * slides: [{ blob, item }] — item이 있으면 아래에 이름·금액과 「상품 자세히」
 */
export default function PhotoViewer({ slides, startIndex = 0, onClose, showItemLink = false }) {
  const [index, setIndex] = useState(Math.min(startIndex, slides.length - 1))
  const touch = useRef(null)
  const slide = slides[index]
  const hasPrev = index > 0
  const hasNext = index < slides.length - 1

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(slides.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose, slides.length])

  function onTouchStart(event) {
    touch.current = event.touches[0].clientX
  }

  function onTouchEnd(event) {
    if (touch.current == null) return
    const dx = event.changedTouches[0].clientX - touch.current
    touch.current = null
    if (dx < -50 && hasNext) setIndex(index + 1)
    if (dx > 50 && hasPrev) setIndex(index - 1)
  }

  if (!slide) return null
  const item = slide.item
  const navButton =
    'absolute top-1/2 flex h-14 w-12 -translate-y-1/2 items-center justify-center rounded-[12px] bg-white/15 text-[34px] leading-none text-white disabled:opacity-0'

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
    >
      <div className="flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <p className="px-2 text-[17px] font-bold text-white/80 tabular">
          {index + 1} / {slides.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-[3rem] items-center gap-1 rounded-[10px] px-3 text-[18px] font-bold text-white"
        >
          ✕ 닫기
        </button>
      </div>

      <div className="relative min-h-0 flex-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <Slide key={index} blob={slide.blob} alt={item?.name || `사진 ${index + 1}`} />
        <button
          type="button"
          onClick={() => setIndex(index - 1)}
          disabled={!hasPrev}
          className={`${navButton} left-2`}
          aria-label="이전 사진"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => setIndex(index + 1)}
          disabled={!hasNext}
          className={`${navButton} right-2`}
          aria-label="다음 사진"
        >
          ›
        </button>
      </div>

      {item && (
        <div className="flex items-center justify-between gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-white">
          <div className="min-w-0">
            <p className="truncate text-[18px] font-bold">{item.name || '이름 없는 상품'}</p>
            <p className="truncate text-[16px] font-semibold text-white/70">
              {[item.shop?.name, formatCurrency(itemTotal(item))].filter(Boolean).join(' · ')}
            </p>
          </div>
          {showItemLink && (
            <Link
              to={`/items/${item.id}`}
              replace
              className="btn shrink-0 bg-white px-3 text-[16px] text-ink"
            >
              상품 자세히
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
