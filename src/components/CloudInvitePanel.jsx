import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { buildInviteUrl } from '../lib/workspace'

export default function CloudInvitePanel({ code, disabled }) {
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState(null)
  const inviteUrl = useMemo(() => (code ? buildInviteUrl(code) : ''), [code])
  const [qrUrl, setQrUrl] = useState('')

  // QR 그림은 앱 안에서 만듦 (초대 주소를 외부 사이트로 보내지 않고, 인터넷이 없어도 보임)
  useEffect(() => {
    let cancelled = false
    if (!inviteUrl) return undefined
    QRCode.toDataURL(inviteUrl, { width: 440, margin: 1 })
      .then((url) => !cancelled && setQrUrl(url))
      .catch(() => !cancelled && setQrUrl(''))
    return () => {
      cancelled = true
    }
  }, [inviteUrl])

  if (!code || !inviteUrl) return null

  async function handleShare() {
    setShareError(null)
    const payload = {
      title: '사입노트 같이 쓰기',
      text: '이 주소를 열면 같은 장부가 자동으로 연결돼요.',
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
    <div className="space-y-3 rounded-[12px] bg-brand-soft p-4">
      <p className="text-[18px] font-extrabold text-brand">다른 폰에도 같은 장부 보기</p>
      <p className="text-[16px] font-semibold leading-relaxed text-ink-muted">
        번호는 치지 않아도 돼요. 카톡으로 보내거나, 아래 네모 그림(QR)을 상대 폰 카메라로 찍게 해 주세요.
      </p>

      <button type="button" onClick={handleShare} disabled={disabled} className="btn btn-primary w-full">
        카톡·문자로 보내기
      </button>

      <button type="button" onClick={handleCopy} disabled={disabled} className="btn btn-outline w-full">
        {copied ? '복사했어요 ✓' : '주소 복사하기'}
      </button>

      {qrUrl && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <img src={qrUrl} alt="초대용 그림 코드(QR)" width={220} height={220} className="rounded-[12px] bg-paper p-2" />
          <p className="text-center text-[16px] font-bold text-ink-muted">상대 폰 카메라로 이 그림을 찍어 주세요</p>
        </div>
      )}

      <p className="break-all rounded-[10px] bg-paper px-3 py-2 text-[16px] font-semibold text-ink-soft">{inviteUrl}</p>
      {shareError && <p className="text-[16px] font-bold text-red-700">{shareError}</p>}
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
