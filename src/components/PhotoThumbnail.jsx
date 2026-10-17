import { useObjectUrl } from '../hooks/useObjectUrl'
import { IconGallery } from './Icons'

const SIZE = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
}

export default function PhotoThumbnail({ blob, alt = '', size = 'md' }) {
  const url = useObjectUrl(blob)
  const box = SIZE[size] ?? SIZE.md

  if (!url) {
    return (
      <div className={`flex ${box} shrink-0 items-center justify-center rounded-xl bg-wash text-ink-muted`}>
        <IconGallery className="h-6 w-6" />
      </div>
    )
  }

  return <img src={url} alt={alt} className={`${box} shrink-0 rounded-xl object-cover bg-wash`} />
}
