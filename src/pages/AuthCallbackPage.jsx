import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSession } from '../lib/auth'

/** 카카오·Google·Apple 로그인 후 돌아오는 화면: 계정과 이 폰 장부를 맞춤 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('working')
  const [detail, setDetail] = useState('로그인하는 중…')
  const [choice, setChoice] = useState(null)
  const started = useRef(false)

  const finish = useCallback(
    (message) => {
      setStatus('done')
      setDetail(message)
      window.setTimeout(() => navigate('/settings?login=1', { replace: true }), 900)
    },
    [navigate],
  )

  const fail = (err) => {
    setStatus('error')
    setDetail(err instanceof Error ? err.message : '로그인을 마치지 못했어요')
  }

  useEffect(() => {
    if (started.current) return // StrictMode에서 두 번 돌지 않게
    started.current = true

    async function run() {
      const params = new URLSearchParams(window.location.search)
      const providerError = params.get('error_description') || params.get('error')
      if (providerError) {
        setStatus('error')
        setDetail('로그인이 취소됐거나 실패했어요. 다시 시도해 주세요.')
        return
      }
      try {
        const session = await getSession()
        if (!session) {
          setStatus('error')
          setDetail('로그인 정보를 받지 못했어요. 다시 시도해 주세요.')
          return
        }
        setDetail('장부를 맞추는 중…')
        const { linkAccountWorkspace } = await import('../db/account')
        const result = await linkAccountWorkspace()
        if (result.status === 'choose') {
          setChoice(result)
          setStatus('choose')
          return
        }
        finish(
          result.status === 'created' || result.status === 'linked'
            ? '로그인했어요. 이 폰 기록을 계정에 저장했어요.'
            : '로그인했어요. 계정 장부를 불러왔어요.',
        )
      } catch (err) {
        fail(err)
      }
    }
    run()
  }, [finish])

  async function choose(localMode) {
    setStatus('working')
    setDetail('계정 장부로 바꾸는 중…')
    try {
      const { openAccountWorkspace } = await import('../db/account')
      await openAccountWorkspace(choice.workspace.code, localMode)
      finish('로그인했어요. 계정 장부를 불러왔어요.')
    } catch (err) {
      fail(err)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-wash px-6 text-center">
      <div className="card w-full max-w-sm p-6">
        <p className="text-[17px] font-extrabold text-brand">사입노트</p>
        <h1 className="mt-2 text-[23px] font-extrabold text-ink">
          {status === 'choose'
            ? '이 폰 기록은 어떻게 할까요?'
            : status === 'error'
              ? '로그인 안내'
              : '로그인'}
        </h1>

        {status === 'choose' ? (
          <div className="mt-3 space-y-3 text-left">
            <p className="text-[16px] font-medium leading-relaxed text-ink-muted">
              {choice?.previousCode
                ? '이 폰은 지금 다른 장부와 연결되어 있어요. 계정에 저장된 장부로 바꿀게요.'
                : '이 폰에 로그인 전에 적어 둔 기록이 있어요.'}
            </p>
            <button
              type="button"
              onClick={() => choose('keep')}
              className="btn btn-primary w-full whitespace-normal"
            >
              이 폰 기록도 계정 장부에 합치기
            </button>
            <button
              type="button"
              onClick={() => choose('discard')}
              className="btn btn-outline w-full whitespace-normal py-2"
            >
              이 폰 기록은 지우고 계정 장부만 보기
            </button>
          </div>
        ) : (
          <p className="mt-3 text-[17px] font-medium leading-relaxed text-ink-muted" aria-live="polite">
            {detail}
          </p>
        )}

        {status === 'error' && (
          <Link to="/login" className="btn btn-primary mt-6 w-full">
            다시 로그인
          </Link>
        )}
        {status === 'working' && (
          <p className="mt-6 text-[16px] font-bold text-ink-soft">잠시만 기다려 주세요…</p>
        )}
      </div>
    </div>
  )
}
