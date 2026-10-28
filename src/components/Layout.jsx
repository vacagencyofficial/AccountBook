import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import CaptureFab from './CaptureFab'
import InstallPrompt from './InstallPrompt'
import { IconHome, IconLedger, IconSettings, IconShop } from './Icons'
import { normalizeWorkspaceCode } from '../lib/workspace'

const tabs = [
  { to: '/', label: '홈', icon: IconHome, end: true, active: 'text-brand bg-brand-soft border-brand/40', idle: 'text-ink-muted' },
  { to: '/shops', label: '가게', icon: IconShop, active: 'text-good bg-good-soft border-good/40', idle: 'text-ink-muted' },
  { to: '/history', label: '장부', icon: IconLedger, active: 'text-ledger bg-ledger-soft border-ledger/40', idle: 'text-ink-muted' },
  { to: '/settings', label: '설정', icon: IconSettings, active: 'text-ink bg-wash border-line', idle: 'text-ink-muted' },
]

export default function Layout() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // 홈에는 큰 「사진 찍고 적기」 버튼이 있으므로 떠 있는 버튼은 다른 화면에서만
  const showFab = pathname !== '/'

  useEffect(() => {
    const raw = searchParams.get('join') || searchParams.get('code')
    const code = normalizeWorkspaceCode(raw || '')
    if (code) {
      navigate(`/join/${encodeURIComponent(code)}`, { replace: true })
    }
  }, [searchParams, navigate])

  return (
    <div className="flex min-h-dvh flex-col">
      <div className={`mx-auto flex w-full max-w-lg flex-1 flex-col ${showFab ? 'pb-48' : 'pb-28'}`}>
        <Outlet />
        <InstallPrompt />
      </div>

      {showFab && <CaptureFab />}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-paper safe-bottom">
        <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 pt-1.5">
          {tabs.map(({ to, label, icon: Icon, end, active, idle }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'tap-target flex flex-col items-center justify-center gap-0.5 border-2 px-1 py-1.5 text-[16px] font-black',
                    isActive ? active : `border-transparent ${idle}`,
                  ].join(' ')
                }
              >
                <Icon className="h-6 w-6" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
