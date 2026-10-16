export default function ImportModeDialog({ onOverwrite, onMerge, onCancel, disabled }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">백업 불러오기</h3>
        <p className="mt-2 text-sm text-slate-500">
          기존 데이터를 어떻게 처리할까요?
        </p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onOverwrite}
            className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-600 disabled:opacity-50"
          >
            덮어쓰기
            <span className="mt-0.5 block text-xs font-normal text-red-400">
              기존 데이터를 모두 삭제하고 백업으로 교체
            </span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onMerge}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            병합
            <span className="mt-0.5 block text-xs font-normal text-white/80">
              기존 데이터에 백업 내용을 추가
            </span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onCancel}
            className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-slate-600"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
