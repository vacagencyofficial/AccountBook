import { IconCamera, IconPlus } from './Icons'

export default function EmptyState({ title, description, action, icon = 'plus' }) {
  const Icon = icon === 'camera' ? IconCamera : IconPlus
  return (
    <div className="card px-5 py-8 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-[19px] font-extrabold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-[19rem] text-[16px] font-semibold leading-relaxed text-ink-soft">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
