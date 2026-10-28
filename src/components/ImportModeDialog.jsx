export default function ImportModeDialog({
  title = '백업에서 되살리기',
  description = '「지금 기록 지우고 바꾸기」는 지금 장부를 비우고 파일 내용으로 채워요. 「지금 기록에 더하기」는 있던 기록에 더해요.',
  disabled,
  onOverwrite,
  onMerge,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="card w-full max-w-sm p-5" role="dialog" aria-modal="true">
        <h3 className="text-[20px] font-extrabold text-ink">{title}</h3>
        <p className="mt-2 text-[17px] font-medium leading-relaxed text-ink-muted">{description}</p>
        <div className="mt-5 space-y-2">
          <button type="button" onClick={onMerge} disabled={disabled} className="btn btn-primary w-full">
            지금 기록에 더하기
          </button>
          <button type="button" onClick={onOverwrite} disabled={disabled} className="btn btn-outline w-full">
            지금 기록 지우고 바꾸기
          </button>
          <button type="button" onClick={onCancel} disabled={disabled} className="btn w-full text-ink-muted">
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
