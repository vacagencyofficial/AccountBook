export default function ImportModeDialog({ disabled, onOverwrite, onMerge, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm border border-line bg-paper p-5">
        <h3 className="text-[16px] font-bold text-ink">백업 불러오기</h3>
        <p className="mt-2 text-[13px] text-ink-muted">
          덮어쓰기는 현재 데이터를 모두 지우고 복원합니다. 병합은 기존 데이터에 추가합니다.
        </p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onOverwrite}
            disabled={disabled}
            className="w-full bg-ink py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            덮어쓰기
          </button>
          <button
            type="button"
            onClick={onMerge}
            disabled={disabled}
            className="w-full border border-line py-2.5 text-[13px] font-medium text-ink disabled:opacity-50"
          >
            병합
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="w-full py-2.5 text-[13px] text-ink-muted"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
