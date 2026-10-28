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
      <div className="w-full max-w-sm border-2 border-line bg-paper p-5" role="dialog" aria-modal="true">
        <h3 className="text-[19px] font-black text-ink">{title}</h3>
        <p className="mt-2 whitespace-pre-line text-[16px] font-medium leading-relaxed text-ink-muted">{description}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="tap-target flex-1 border-2 border-line text-[17px] font-bold text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className={`tap-target flex-1 text-[17px] font-black text-white disabled:opacity-50 ${
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
