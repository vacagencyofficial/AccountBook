import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStorageStatus } from '../lib/storageStatus'
import { formatFileSize } from '../utils/photoConfig'

/** 홈: 사진 공간이 거의 차면 백업·정리를 권함 */
export default function StorageWarning() {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    getStorageStatus().then((result) => alive && setStatus(result))
    return () => {
      alive = false
    }
  }, [])

  if (!status?.nearlyFull) return null
  const cloudFull = status.cloud && status.cloud.usage / status.cloud.quota >= status.ratio - 0.0001

  async function backupNow() {
    setBusy(true)
    try {
      const { exportBackup } = await import('../utils/backup')
      await exportBackup()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 rounded-[var(--radius-card)] bg-red-50 px-4 py-3.5">
      <p className="text-[18px] font-extrabold text-red-700">사진 공간이 거의 찼어요</p>
      <p className="mt-0.5 text-[16px] font-semibold leading-snug text-ink-muted">
        {cloudFull
          ? `같이 쓰는 사진 공간 ${formatFileSize(status.cloud.usage)} / 1GB (${Math.round(status.ratio * 100)}%)`
          : `이 폰 저장 공간의 ${Math.round(status.ratio * 100)}%를 쓰고 있어요`}
        . 백업해 두고 오래된 사진을 정리해 주세요.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={backupNow} disabled={busy} className="btn btn-primary text-[17px]">
          {busy ? '만드는 중…' : '지금 백업하기'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/settings', { state: { openCleanup: true } })}
          className="btn btn-outline text-[17px]"
        >
          사진 정리하기
        </button>
      </div>
    </div>
  )
}
