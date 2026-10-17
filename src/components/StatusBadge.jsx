const TONES = {
  구매: 'bg-good-soft text-good',
  검토: 'bg-warn-soft text-warn',
  보류: 'bg-wash text-ink-muted',
}

export default function StatusBadge({ status }) {
  const label = status || '구매'
  return (
    <span className={`inline-flex rounded-lg px-2 py-0.5 text-[13px] font-black ${TONES[label] ?? TONES['구매']}`}>
      {label}
    </span>
  )
}
