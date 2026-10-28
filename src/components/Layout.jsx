import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import CaptureFab from './CaptureFab'
import InstallPrompt from './InstallPrompt'
import { IconHome, IconLedger, IconSettings, IconShop } from './Icons'
import { normalizeWorkspaceCode } from '../lib/workspace'

const tabs = [
  { to: '/', label: '홈', hint: '파랑', icon: IconHome, end: true, active: 'text-brand bg-brand-soft border-brand/40', idle: 'text-ink-muted' },
  { to: '/shops', label: '가게', hint: '초록', icon: IconShop, active: 'text-good bg-good-soft border-good/40', idle: 'text-ink-muted' },
  { to: '/history', label: '장부', hint: '보라', icon: IconLedger, active: 'text-ledger bg-ledger-soft border-ledger/40', idle: 'text-ink-muted' },
  { to: '/settings', label: '설정', hint: '더보기', icon: IconSettings, active: 'text-ink bg-wash border-line', idle: 'text-ink-muted' },
]

export default function Layout() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const raw = searchParams.get('join') || searchParams.get('code')
    const code = normalizeWorkspaceCode(raw || '')
    if (code) {
      navigate(`/join/${encodeURIComponent(code)}`, { replace: true })
    }
  }, [searchParams, navigate])

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-28">
        <Outlet />
      </div>

      <CaptureFab />
      <InstallPrompt />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-paper safe-bottom">
        <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 pt-1.5">
          {tabs.map(({ to, label, hint, icon: Icon, end, active, idle }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'tap-target flex flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 py-1.5 text-[14px] font-black',
                    isActive ? active : `border-transparent ${idle}`,
                  ].join(' ')
                }
              >
                <Icon className="h-6 w-6" />
                <span>{label}</span>
                <span className="text-[10px] font-bold opacity-70">{hint}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
