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
      <div className="w-full max-w-sm border border-line bg-paper p-5">
        <h3 className="text-[16px] font-bold text-ink">{title}</h3>
        <p className="mt-2 text-[13px] text-ink-muted">{description}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="flex-1 border border-line py-2.5 text-[13px] font-medium text-ink-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className={`flex-1 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 ${
              danger ? 'bg-red-600' : 'bg-ink'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
