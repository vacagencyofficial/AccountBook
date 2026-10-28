import { statusLabel } from '../utils/labels'

const TONES = {
  구매: 'bg-good-soft text-good',
  검토: 'bg-warn-soft text-warn',
  보류: 'bg-line-soft text-ink-muted',
}

export default function StatusBadge({ status }) {
  const value = status || '구매'
  return <span className={`pill ${TONES[value] ?? TONES['구매']}`}>{statusLabel(value)}</span>
}
