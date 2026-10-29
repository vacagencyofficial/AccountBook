import { useState } from 'react'
import { backupReminder, snoozeBackupReminder } from '../lib/backupStatus'
import { getWorkspaceCode } from '../lib/workspace'

/** 홈: 같이 쓰기를 안 하는데 오래 백업하지 않았으면 알려 줌 */
export default function BackupReminder({ items }) {
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  const oldestItemAt = items.reduce((min, item) => Math.min(min, item.createdAt || Infinity), Infinity)
  const reminder = backupReminder({
    oldestItemAt: Number.isFinite(oldestItemAt) ? oldestItemAt : 0,
    cloudConnected: Boolean(getWorkspaceCode()),
  })
  if (hidden || !reminder) return null

  async function backupNow() {
    setBusy(true)
    try {
      const { exportBackup } = await import('../utils/backup')
      await exportBackup()
      setHidden(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 rounded-[var(--radius-card)] bg-warn-soft px-4 py-3.5">
      <p className="text-[18px] font-extrabold text-ink">
        {reminder.neverBackedUp ? '아직 백업한 적이 없어요' : `백업한 지 ${reminder.days}일 지났어요`}
      </p>
      <p className="mt-0.5 text-[16px] font-semibold leading-snug text-ink-muted">
        폰을 잃어버려도 기록을 되살릴 수 있게 사진까지 파일로 저장해 두세요.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={backupNow}
          disabled={busy}
          className="btn btn-primary flex-1 text-[17px]"
        >
          {busy ? '만드는 중…' : '지금 백업하기'}
        </button>
        <button
          type="button"
          onClick={() => {
            snoozeBackupReminder()
            setHidden(true)
          }}
          className="btn btn-outline text-[17px]"
        >
          나중에
        </button>
      </div>
    </div>
  )
}
