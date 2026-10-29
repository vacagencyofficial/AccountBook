const LAST_KEY = 'sailp-last-backup'
const SNOOZE_KEY = 'sailp-backup-snooze'
const DAY = 24 * 60 * 60 * 1000

function read(key) {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // 저장이 막힌 브라우저면 이번에만
  }
}

export function getLastBackupAt() {
  return read(LAST_KEY)
}

export function markBackupDone() {
  write(LAST_KEY, Date.now())
}

export function snoozeBackupReminder(days = 7) {
  write(SNOOZE_KEY, Date.now() + days * DAY)
}

/**
 * 홈에 「백업해 두세요」를 띄울지.
 * 같이 쓰기(클라우드)를 안 쓰고, 기록이 생긴 지 3일이 지났는데 백업이 없거나 마지막 백업이 30일 넘었을 때
 */
export function backupReminder({ oldestItemAt, cloudConnected, now = Date.now() }) {
  if (cloudConnected || !oldestItemAt) return null
  if (read(SNOOZE_KEY) > now) return null
  const last = read(LAST_KEY)
  if (!last) return now - oldestItemAt > 3 * DAY ? { neverBackedUp: true } : null
  const days = Math.floor((now - last) / DAY)
  return days >= 30 ? { days } : null
}
