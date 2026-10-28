import { useMemo, useState } from 'react'
import { buildInviteUrl, qrImageUrl } from '../lib/workspace'

export default function CloudInvitePanel({ code, disabled }) {
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState(null)
  const inviteUrl = useMemo(() => (code ? buildInviteUrl(code) : ''), [code])
  const qrUrl = useMemo(() => (inviteUrl ? qrImageUrl(inviteUrl, 220) : ''), [inviteUrl])

  if (!code || !inviteUrl) return null

  async function handleShare() {
    setShareError(null)
    const payload = {
      title: '사입노트 같이 쓰기',
      text: '이 주소를 열면 같은 장부가 자동으로 연결됩니다.',
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
      setShareError('보내기에 실패했어요. 아래 「주소 복사」를 눌러 주세요.')
    }
  }

  async function handleCopy() {
    setShareError(null)
    try {
      await copyText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareError('복사가 안 되면, 아래 주소를 길게 눌러 복사해 주세요.')
    }
  }

  return (
    <div className="space-y-3 border-2 border-brand/40 bg-brand-soft p-4">
      <p className="text-[17px] font-black text-brand">다른 폰에도 같은 장부 보기</p>
      <p className="text-[15px] font-semibold leading-relaxed text-ink-muted">
        어려운 번호는 치지 않아도 됩니다. 카톡으로 보내거나, 아래 네모 그림(QR)을 보여 주세요.
      </p>

      <button
        type="button"
        onClick={handleShare}
        disabled={disabled}
        className="tap-target w-full bg-brand text-[18px] font-black text-white disabled:opacity-50"
      >
        카톡·문자로 보내기
      </button>

      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className="tap-target w-full border-2 border-brand bg-paper text-[16px] font-black text-brand disabled:opacity-50"
      >
        {copied ? '복사했어요 ✓' : '주소 복사하기'}
      </button>

      <div className="flex flex-col items-center gap-2 pt-1">
        <img
          src={qrUrl}
          alt="초대용 그림 코드"
          width={220}
          height={220}
          className=" border-2 border-line bg-paper p-2"
        />
        <p className="text-center text-[14px] font-bold text-ink-muted">상대 폰 카메라로 이 그림을 찍어 주세요</p>
      </div>

      <p className="break-all bg-paper px-3 py-2 text-[12px] font-semibold text-ink-muted">{inviteUrl}</p>
      {shareError && <p className="text-[14px] font-bold text-red-600">{shareError}</p>}
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
