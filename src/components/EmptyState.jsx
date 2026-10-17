import { IconPlus } from './Icons'

export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-wash px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <IconPlus className="h-6 w-6" />
      </div>
      <p className="text-[17px] font-black text-ink">{title}</p>
      {description && <p className="mt-1 text-[15px] font-medium text-ink-muted">{description}</p>}
      {action}
    </div>
  )
}
