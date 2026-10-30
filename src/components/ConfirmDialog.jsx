export default function ConfirmDialog({
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  danger = false,
  disabled = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="card w-full max-w-sm p-5" role="dialog" aria-modal="true">
        <h3 className="text-[20px] font-extrabold text-ink">{title}</h3>
        <p className="mt-2 whitespace-pre-line text-[17px] font-medium leading-relaxed text-ink-muted">
          {description}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} disabled={disabled} className="btn btn-outline">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
