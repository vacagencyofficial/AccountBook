const LAST_SYNC_KEY = 'sailp-last-sync'
const SYNC_ERROR_KEY = 'sailp-sync-error'

/** 마지막으로 다른 폰과 맞춘 시각(ms)과, 마지막 맞추기가 실패했는지 */
export function getSyncStatus() {
  try {
    return {
      lastSyncedAt: Number(localStorage.getItem(LAST_SYNC_KEY)) || null,
      failed: localStorage.getItem(SYNC_ERROR_KEY) === '1',
    }
  } catch {
    return { lastSyncedAt: null, failed: false }
  }
}

export function markSyncSucceeded() {
  try {
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()))
    localStorage.removeItem(SYNC_ERROR_KEY)
  } catch {
    // 상태 기록 실패는 무시
  }
}

export function markSyncFailed() {
  try {
    localStorage.setItem(SYNC_ERROR_KEY, '1')
  } catch {
    // 상태 기록 실패는 무시
  }
}

/** "오늘 오후 4:12" / "10월 27일 오후 2:05" */
export function formatSyncTime(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  return sameDay ? `오늘 ${time}` : `${d.getMonth() + 1}월 ${d.getDate()}일 ${time}`
}
