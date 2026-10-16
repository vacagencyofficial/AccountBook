export default function EmptyState({ title, description, action }) {
  return (
    <div className="border border-dashed border-line px-4 py-10 text-center">
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 text-[13px] text-ink-muted">{description}</p>}
      {action}
    </div>
  )
}
