import { formatFileSize } from './photoConfig'

export function formatStorageEstimate(usage, quota) {
  if (usage == null) return '확인 불가'
  if (quota == null) return formatFileSize(usage)
  const ratio = quota > 0 ? usage / quota : 0
  // 어려운 MB·% 대신 쉬운 말로, 숫자는 뒤에 작게
  const level =
    ratio < 0.5
      ? '공간이 넉넉해요'
      : ratio < 0.85
        ? '공간이 조금 남았어요'
        : '공간이 거의 찼어요. 백업 후 사진을 정리해 주세요'
  return `${level} (사진·기록 ${formatFileSize(usage)} 사용 중)`
}
