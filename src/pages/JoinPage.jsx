import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { isCloudConfigured } from '../lib/supabase'
import { getWorkspaceCode, normalizeWorkspaceCode } from '../lib/workspace'

export default function JoinPage() {
  const { code: pathCode } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('connecting')
  const [detail, setDetail] = useState('장부를 연결하는 중…')
  const [joinedCode, setJoinedCode] = useState('')
  const [previousCode, setPreviousCode] = useState('')

  const code = normalizeWorkspaceCode(pathCode || searchParams.get('join') || searchParams.get('code') || '')

  const connect = useCallback(
    async (localMode) => {
      setStatus('connecting')
      setDetail('장부를 연결하는 중…')
      try {
        const { connectWorkspace, syncBidirectional } = await import('../db/cloudSync')
        const ws = await connectWorkspace(code, { localMode })
        setJoinedCode(ws.code)
        setDetail('클라우드에서 불러오는 중…')
        await syncBidirectional()
        setStatus('done')
        setDetail('연결했어요. 같은 장부를 이 폰에서도 쓸 수 있어요.')
        window.setTimeout(() => navigate('/settings?joined=1', { replace: true }), 1200)
      } catch (err) {
        setStatus('error')
        setDetail(err instanceof Error ? err.message : '연결에 실패했습니다')
      }
    },
    [code, navigate],
  )

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!code) {
        setStatus('error')
        setDetail('초대 주소가 올바르지 않아요. 보내 준 분께 다시 받아 주세요.')
        return
      }

      if (!isCloudConfigured) {
        setStatus('error')
        setDetail('아직 다른 폰과 같이 쓸 준비가 안 됐어요. 도와주시는 분께 말씀해 주세요.')
        return
      }

      const existing = getWorkspaceCode()
      if (existing === code) {
        connect('keep')
        return
      }

      // 다른 장부를 쓰고 있었거나, 이 폰에 기록이 있으면 어떻게 할지 물어봄
      const { hasLocalRecords } = await import('../db/cloudSync')
      const hasLocal = await hasLocalRecords()
      if (cancelled) return
      if (existing || hasLocal) {
        setPreviousCode(existing)
        setStatus('choose')
        return
      }
      connect('keep')
    }

    start()
    return () => {
      cancelled = true
    }
  }, [code, connect])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-wash px-6 text-center">
      <div className="card w-full max-w-sm p-6">
        <p className="text-[17px] font-extrabold text-brand">사입노트</p>
        <h1 className="mt-2 text-[23px] font-extrabold text-ink">
          {status === 'done'
            ? '연결 완료'
            : status === 'choose'
              ? '이 폰 기록은 어떻게 할까요?'
              : status === 'error' || status === 'cancelled'
                ? '연결 안내'
                : '장부 초대'}
        </h1>

        {status === 'choose' ? (
          <div className="mt-3 space-y-3 text-left">
            <p className="text-[16px] font-medium leading-relaxed text-ink-muted">
              {previousCode
                ? '이 폰은 지금 다른 장부와 연결되어 있어요. 초대받은 장부로 바꿀게요.'
                : '이 폰에 적어 둔 기록이 있어요.'}
            </p>
            <button
              type="button"
              onClick={() => connect('keep')}
              className="btn btn-primary w-full whitespace-normal"
            >
              이 폰 기록도 함께 옮기기
            </button>
            <button
              type="button"
              onClick={() => connect('discard')}
              className="btn btn-outline w-full whitespace-normal py-2"
            >
              이 폰 기록은 지우고 초대받은 장부만 보기
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus('cancelled')
                setDetail('연결하지 않았어요. 이 폰 기록은 그대로예요.')
              }}
              className="btn w-full text-ink-muted"
            >
              취소
            </button>
          </div>
        ) : (
          <p className="mt-3 text-[17px] font-medium leading-relaxed text-ink-muted">{detail}</p>
        )}

        {joinedCode && status === 'done' && (
          <p className="mt-3 rounded-[10px] bg-good-soft px-3 py-2 text-[16px] font-bold text-good">{joinedCode}</p>
        )}
        {(status === 'error' || status === 'cancelled' || status === 'done') && (
          <Link
            to={status === 'done' ? '/' : '/settings'}
            className="btn btn-primary mt-6 w-full"
          >
            {status === 'done' ? '홈으로' : '설정으로 이동'}
          </Link>
        )}
        {status === 'connecting' && (
          <p className="mt-6 text-[16px] font-bold text-ink-soft">잠시만 기다려 주세요…</p>
        )}
      </div>
    </div>
  )
}
