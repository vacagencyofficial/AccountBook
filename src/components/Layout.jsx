import { NavLink, Outlet } from 'react-router-dom'
import CaptureFab from './CaptureFab'
import InstallPrompt from './InstallPrompt'
import { IconHome, IconLedger, IconSettings, IconShop } from './Icons'

const tabs = [
  { to: '/', label: '홈', icon: IconHome, end: true, active: 'text-brand bg-brand-soft' },
  { to: '/shops', label: '가게', icon: IconShop, active: 'text-good bg-good-soft' },
  { to: '/history', label: '장부', icon: IconLedger, active: 'text-ledger bg-ledger-soft' },
  { to: '/settings', label: '설정', icon: IconSettings, active: 'text-ink bg-wash' },
]

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-wash">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-24">
        <Outlet />
      </div>

      <CaptureFab />
      <InstallPrompt />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-paper safe-bottom">
        <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 pt-1.5">
          {tabs.map(({ to, label, icon: Icon, end, active }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'tap-target flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[13px] font-bold transition',
                    isActive ? active : 'text-ink-muted',
                  ].join(' ')
                }
              >
                <Icon className="h-6 w-6" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
