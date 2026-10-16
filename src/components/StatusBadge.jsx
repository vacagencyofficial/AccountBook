export default function StatusBadge({ status }) {
  const label = status || '구매'
  return <span className="font-medium text-ink">{label}</span>
}
