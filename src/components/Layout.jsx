import { useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import InstallPrompt from './InstallPrompt'
import { IconCamera, IconHome, IconLedger, IconSettings, IconShop } from './Icons'
import { normalizeWorkspaceCode } from '../lib/workspace'

const leftTabs = [
  { to: '/', label: '홈', icon: IconHome, end: true },
  { to: '/history', label: '장부', icon: IconLedger },
]
const rightTabs = [
  { to: '/shops', label: '가게', icon: IconShop },
  { to: '/settings', label: '설정', icon: IconSettings },
]

function Tab({ to, label, icon: Icon, end }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          [
            'tap-target flex flex-col items-center justify-center gap-0.5 rounded-[10px] py-1.5 text-[16px] font-bold',
            isActive ? 'text-brand' : 'text-ink-soft',
          ].join(' ')
        }
      >
        <Icon className="h-7 w-7" />
        <span>{label}</span>
      </NavLink>
    </li>
  )
}

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
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-32">
        <Outlet />
        <InstallPrompt />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 bg-paper shadow-[0_-4px_18px_rgb(15_23_42/0.08)] safe-bottom">
        <ul className="mx-auto grid max-w-lg grid-cols-[1fr_1fr_1.3fr_1fr_1fr] items-end px-2 pt-1.5">
          {leftTabs.map((tab) => (
            <Tab key={tab.to} {...tab} />
          ))}
          <li>
            <Link
              to="/capture"
              className="-mt-8 flex flex-col items-center gap-1 text-[16px] font-extrabold text-accent-dark"
            >
              <span className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#f97316] to-accent-dark text-white shadow-[0_8px_18px_rgb(234_88_12/0.35)]">
                <IconCamera className="h-8 w-8" />
              </span>
              물건 적기
            </Link>
          </li>
          {rightTabs.map((tab) => (
            <Tab key={tab.to} {...tab} />
          ))}
        </ul>
      </nav>
    </div>
  )
}
