const TONES = {
  구매: 'bg-brand-soft text-brand',
  검토: 'bg-amber-50 text-amber-800',
  보류: 'bg-slate-100 text-slate-600',
}

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${TONES[status] ?? TONES['구매']}`}
    >
      {status || '구매'}
    </span>
  )
}
