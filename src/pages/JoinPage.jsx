import { useEffect, useState } from 'react'
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

  useEffect(() => {
    let cancelled = false

    async function run() {
      const raw = pathCode || searchParams.get('join') || searchParams.get('code') || ''
      const code = normalizeWorkspaceCode(raw)

      if (!code) {
        setStatus('error')
        setDetail('초대 링크가 올바르지 않습니다.')
        return
      }

      if (!isCloudConfigured) {
        setStatus('error')
        setDetail('이 앱에 클라우드가 아직 연결되지 않았습니다. 관리자에게 문의해 주세요.')
        return
      }

      const existing = getWorkspaceCode()
      if (existing && existing !== code) {
        const ok = window.confirm(
          `지금 이 기기에는 다른 장부(${existing})가 연결되어 있습니다.\n\n새 초대(${code})로 바꿀까요?\n(기존 로컬 데이터는 남고, 클라우드 내용은 새 장부 기준으로 맞춰집니다)`,
        )
        if (!ok) {
          setStatus('cancelled')
          setDetail('연결을 취소했습니다.')
          return
        }
      }

      try {
        const { connectWorkspace, syncBidirectional } = await import('../db/cloudSync')
        const ws = await connectWorkspace(code)
        if (cancelled) return
        setJoinedCode(ws.code)
        setDetail('클라우드에서 불러오는 중…')
        await syncBidirectional()
        if (cancelled) return
        setStatus('done')
        setDetail('연결되었습니다. 같은 장부를 이 기기에서도 쓸 수 있습니다.')
        window.setTimeout(() => navigate('/settings?joined=1', { replace: true }), 1200)
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setDetail(err instanceof Error ? err.message : '연결에 실패했습니다')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [pathCode, searchParams, navigate])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-wash px-6 text-center">
      <div className="w-full max-w-sm border-2 border-line bg-paper p-6">
        <p className="text-[15px] font-black text-brand">사입노트</p>
        <h1 className="mt-2 text-[22px] font-black text-ink">
          {status === 'done' ? '연결 완료' : status === 'error' || status === 'cancelled' ? '연결 안내' : '장부 초대'}
        </h1>
        <p className="mt-3 text-[16px] font-medium leading-relaxed text-ink-muted">{detail}</p>
        {joinedCode && status === 'done' && (
          <p className="mt-3 bg-good-soft px-3 py-2 text-[15px] font-bold text-good">{joinedCode}</p>
        )}
        {(status === 'error' || status === 'cancelled' || status === 'done') && (
          <Link
            to={status === 'done' ? '/' : '/settings'}
            className="tap-target mt-6 flex w-full items-center justify-center bg-brand text-[16px] font-black text-white"
          >
            {status === 'done' ? '홈으로' : '설정으로 이동'}
          </Link>
        )}
        {status === 'connecting' && (
          <p className="mt-6 text-[14px] font-bold text-ink-muted">잠시만 기다려 주세요…</p>
        )}
      </div>
    </div>
  )
}
