import { Link } from 'react-router-dom'

export default function CaptureFab() {
  return (
    <Link
      to="/capture"
      aria-label="사진 촬영 후 등록"
      className="fixed bottom-[3.75rem] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white active:opacity-80 md:right-[calc(50%-14.5rem)]"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
