import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import SocialLoginButtons from '../components/SocialLoginButtons'
import { isAuthAvailable } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'

/** 간편 로그인 화면 (로그인 없이도 계속 쓸 수 있음) */
export default function LoginPage() {
  const { loading, user } = useAuth()
  const [error, setError] = useState(null)

  if (!loading && user) return <Navigate to="/settings" replace />

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-wash px-6">
      <div className="card w-full max-w-sm p-6">
        <p className="text-[17px] font-extrabold text-brand">사입노트</p>
        <h1 className="mt-2 text-[24px] font-extrabold leading-snug text-ink">
          로그인하면
          <br />
          폰을 바꿔도 장부가 그대로예요
        </h1>
        <p className="mt-2 text-[16px] font-medium leading-relaxed text-ink-muted">
          지금 이 폰에 적어 둔 기록은 로그인한 계정으로 함께 옮겨져요.
        </p>

        {error && (
          <p
            className="mt-4 rounded-[10px] bg-red-50 px-3 py-2 text-[16px] font-bold text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-5">
          {isAuthAvailable ? (
            <SocialLoginButtons onError={setError} />
          ) : (
            <p className="rounded-[10px] bg-warn-soft px-3 py-2 text-[16px] font-bold text-warn">
              아직 로그인 준비가 안 됐어요. 클라우드 설정(Supabase 키)이 필요해요.
            </p>
          )}
        </div>

        <Link to="/" className="btn mt-4 w-full text-ink-muted">
          로그인 없이 쓰기
        </Link>
      </div>
    </div>
  )
}
