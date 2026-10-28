import { useMemo, useState } from 'react'
import { buildInviteUrl, qrImageUrl } from '../lib/workspace'

/**
 * 코드 타이핑 없이 링크·QR·공유로 다른 기기를 연결
 */
export default function CloudInvitePanel({ code, disabled }) {
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState(null)
  const inviteUrl = useMemo(() => (code ? buildInviteUrl(code) : ''), [code])
  const qrUrl = useMemo(() => (inviteUrl ? qrImageUrl(inviteUrl, 220) : ''), [inviteUrl])

  if (!code || !inviteUrl) return null

  async function handleShare() {
    setShareError(null)
    const payload = {
      title: '사입노트 장부 초대',
      text: '이 링크를 열면 같은 사입장부가 자동으로 연결됩니다.',
      url: inviteUrl,
    }
    try {
      if (navigator.share) {
        await navigator.share(payload)
        return
      }
      await copyText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setShareError('공유에 실패했습니다. 아래 복사 버튼을 사용해 주세요.')
    }
  }

  async function handleCopy() {
    setShareError(null)
    try {
      await copyText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareError('복사에 실패했습니다. 주소를 길게 눌러 복사해 주세요.')
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-brand/25 bg-brand-soft/40 p-4">
      <p className="text-[16px] font-black text-brand">다른 기기와 같이 쓰기</p>
      <p className="text-[14px] font-medium leading-relaxed text-ink-muted">
        코드를 적을 필요 없습니다. 링크를 보내거나 QR을 보여 주면, 상대 폰에서 열자마자 연결됩니다.
      </p>

      <button
        type="button"
        onClick={handleShare}
        disabled={disabled}
        className="tap-target w-full rounded-2xl bg-brand text-[17px] font-black text-white disabled:opacity-50"
      >
        카톡·문자로 초대 보내기
      </button>

      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className="tap-target w-full rounded-2xl border-2 border-brand bg-paper text-[16px] font-bold text-brand disabled:opacity-50"
      >
        {copied ? '복사됨 ✓' : '초대 링크 복사'}
      </button>

      <div className="flex flex-col items-center gap-2 pt-1">
        <img
          src={qrUrl}
          alt="초대 QR 코드"
          width={220}
          height={220}
          className="rounded-2xl border-2 border-line bg-paper p-2"
        />
        <p className="text-center text-[13px] font-bold text-ink-muted">상대 폰 카메라로 이 QR을 찍으세요</p>
      </div>

      <p className="break-all rounded-xl bg-paper px-3 py-2 text-[12px] font-medium text-ink-muted">{inviteUrl}</p>
      {shareError && <p className="text-[13px] font-bold text-red-600">{shareError}</p>}
    </div>
  )
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}
