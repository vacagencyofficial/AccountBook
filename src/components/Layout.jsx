import { NavLink, Outlet } from 'react-router-dom'
import CaptureFab from './CaptureFab'
import InstallPrompt from './InstallPrompt'

const tabs = [
  { to: '/', label: '홈', icon: HomeIcon, end: true },
  { to: '/shops', label: '가게', icon: ShopIcon },
  { to: '/history', label: '장부', icon: HistoryIcon },
  { to: '/settings', label: '설정', icon: SettingsIcon },
]

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-24">
        <Outlet />
      </div>

      <CaptureFab />
      <InstallPrompt />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-raised/95 backdrop-blur-md safe-bottom">
        <ul className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-2">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition',
                    isActive ? 'text-brand' : 'text-ink-muted hover:text-ink',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={[
                        'flex h-8 w-8 items-center justify-center rounded-xl transition',
                        isActive ? 'bg-brand-soft text-brand' : 'text-ink-muted',
                      ].join(' ')}
                    >
                      <Icon active={isActive} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function ShopIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 5 4h14l2 5.5M3 9.5h18M5 9.5V20h14V9.5M9 13h6" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2M21 12a9 9 0 1 1-9-9" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2.12 2.12 0 1 1-3 3l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2.12 2.12 0 1 1-4.24 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2.12 2.12 0 1 1-3-3l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2.12 2.12 0 1 1 0-4.24h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2.12 2.12 0 1 1 3-3l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2.12 2.12 0 1 1 4.24 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2.12 2.12 0 1 1 3 3l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.88 1 1.51 1H21a2.12 2.12 0 1 1 0 4.24h-.09a1.65 1.65 0 0 0-1.51 1Z"
      />
    </svg>
  )
}
