import { Link } from 'react-router-dom'

export default function CaptureFab() {
  return (
    <Link
      to="/capture"
      aria-label="사진 촬영 후 등록"
      className="animate-soft-pulse fixed bottom-[4.75rem] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white transition active:scale-95 active:bg-accent-dark md:right-[calc(50%-14.5rem)]"
    >
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.1l1.2-2h8.4l1.2 2h2.1A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z"
        />
        <circle cx="12" cy="13" r="3.25" />
      </svg>
    </Link>
  )
}
