import { useObjectUrl } from '../hooks/useObjectUrl'

const SIZE = {
  sm: 'h-12 w-12',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
}

export default function PhotoThumbnail({ blob, alt = '', size = 'md' }) {
  const url = useObjectUrl(blob)
  const box = SIZE[size] ?? SIZE.md

  if (!url) {
    return (
      <div className={`flex ${box} shrink-0 items-center justify-center rounded-xl bg-paper text-ink-muted`}>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`${box} shrink-0 rounded-xl object-cover bg-paper`}
    />
  )
}
