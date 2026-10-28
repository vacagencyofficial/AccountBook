import { Link } from 'react-router-dom'
import { IconCamera } from './Icons'

export default function CaptureFab() {
  return (
    <Link
      to="/capture"
      aria-label="사진 찍고 적기"
      className="fixed bottom-[5.75rem] right-3 z-40 flex flex-col items-center"
    >
      <span className="flex h-[4.25rem] w-[4.25rem] items-center justify-center border-4 border-white bg-accent text-white shadow-lg shadow-accent/40 active:bg-accent-dark">
        <IconCamera className="h-8 w-8" />
      </span>
      <span className="mt-1 bg-accent-dark px-2 py-0.5 text-[12px] font-black text-white">
        사진
      </span>
    </Link>
  )
}