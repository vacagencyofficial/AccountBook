import { formatFileSize } from './photoConfig'

export function formatStorageEstimate(usage, quota) {
  if (usage == null) return '확인 불가'
  if (quota == null) return formatFileSize(usage)
  const pct = quota > 0 ? Math.round((usage / quota) * 100) : 0
  return `${formatFileSize(usage)} / ${formatFileSize(quota)} (${pct}%)`
}
