import { NavLink, Outlet } from 'react-router-dom'
import CaptureFab from './CaptureFab'
import InstallPrompt from './InstallPrompt'

const tabs = [
  { to: '/', label: '홈', end: true },
  { to: '/shops', label: '가게' },
  { to: '/history', label: '장부' },
  { to: '/settings', label: '설정' },
]

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-20">
        <Outlet />
      </div>

      <CaptureFab />
      <InstallPrompt />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper safe-bottom">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'flex h-12 items-center justify-center text-[13px] transition',
                    isActive ? 'font-bold text-ink' : 'font-medium text-ink-muted',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
