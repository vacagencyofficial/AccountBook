import { useState } from 'react'
import { getAuthProviders, signInWithProvider } from '../lib/auth'

/** 각 회사 안내에 맞춘 버튼 색 (카카오 노랑, Google 흰색, Apple 검정) */
const STYLES = {
  kakao: 'bg-[#FEE500] text-black/85 border border-[#FEE500]',
  google: 'bg-white text-[#1f1f1f] border border-[#747775]',
  apple: 'bg-black text-white border border-black',
}

function ProviderMark({ id }) {
  if (id === 'kakao') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M12 3C6.48 3 2 6.48 2 10.78c0 2.78 1.86 5.22 4.66 6.6l-.95 3.48c-.08.3.26.54.52.37l4.13-2.73c.54.06 1.08.09 1.64.09 5.52 0 10-3.48 10-7.81S17.52 3 12 3z"
        />
      </svg>
    )
  }
  if (id === 'google') {
    return (
      <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden>
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.37-3.69zM14.1 5.85c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28z"
      />
    </svg>
  )
}

/** 카카오·Google·Apple 간편 로그인 버튼 묶음 */
export default function SocialLoginButtons({ onError }) {
  const [busy, setBusy] = useState('')
  const providers = getAuthProviders()

  async function handle(id) {
    setBusy(id)
    onError?.(null)
    try {
      await signInWithProvider(id) // 성공하면 로그인 화면으로 넘어감
    } catch (err) {
      onError?.(err instanceof Error ? err.message : '로그인에 실패했어요')
      setBusy('')
    }
  }

  return (
    <div className="space-y-2.5">
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => handle(p.id)}
          disabled={Boolean(busy)}
          className={`flex min-h-[3.5rem] w-full items-center justify-center gap-2.5 rounded-[12px] px-4 text-[18px] font-bold disabled:opacity-60 ${STYLES[p.id]}`}
        >
          <ProviderMark id={p.id} />
          {busy === p.id ? '여는 중…' : p.label}
        </button>
      ))}
    </div>
  )
}
