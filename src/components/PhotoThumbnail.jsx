import { useObjectUrl } from '../hooks/useObjectUrl'

const SIZE = {
  sm: 'h-11 w-11',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
}

export default function PhotoThumbnail({ blob, alt = '', size = 'md' }) {
  const url = useObjectUrl(blob)
  const box = SIZE[size] ?? SIZE.md

  if (!url) {
    return (
      <div className={`flex ${box} shrink-0 items-center justify-center bg-wash text-[11px] text-ink-muted`}>
        없음
      </div>
    )
  }

  return <img src={url} alt={alt} className={`${box} shrink-0 object-cover bg-wash`} />
}
