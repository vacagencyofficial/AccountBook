import { Link } from 'react-router-dom'
import { IconCamera } from './Icons'

export default function CaptureFab() {
  return (
    <Link
      to="/capture"
      aria-label="사진 찍고 기록하기"
      className="fixed bottom-[5.25rem] right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 active:bg-accent-dark md:right-[calc(50%-14.5rem)]"
    >
      <IconCamera className="h-8 w-8" />
    </Link>
  )
}
