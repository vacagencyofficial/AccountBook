import { IconCamera, IconPlus } from './Icons'

const tones = {
  brand: 'border-brand/40 bg-brand-soft/50 text-brand',
  good: 'border-good/40 bg-good-soft/60 text-good',
  ledger: 'border-ledger/40 bg-ledger-soft/60 text-ledger',
  accent: 'border-accent/50 bg-accent-soft text-accent-dark',
}

export default function EmptyState({ title, description, action, tone = 'brand', icon = 'plus' }) {
  const Icon = icon === 'camera' ? IconCamera : IconPlus
  return (
    <div className={` border-2 border-dashed px-4 py-9 text-center ${tones[tone] || tones.brand}`}>
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center bg-paper shadow-sm">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-[18px] font-black text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-[18rem] text-[15px] font-semibold leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
