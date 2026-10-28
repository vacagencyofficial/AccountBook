import { useObjectUrl } from '../hooks/useObjectUrl'
import { IconGallery } from './Icons'

const SIZE = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-[4.25rem] w-[4.25rem]',
}

export default function PhotoThumbnail({ blob, alt = '', size = 'md' }) {
  const url = useObjectUrl(blob)
  const box = SIZE[size] ?? SIZE.md

  if (!url) {
    return (
      <div className={`flex ${box} shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand/60`}>
        <IconGallery className="h-7 w-7" />
      </div>
    )
  }

  return <img src={url} alt={alt} className={`${box} shrink-0 rounded-[10px] bg-wash object-cover`} />
}
