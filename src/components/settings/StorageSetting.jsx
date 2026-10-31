import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../ConfirmDialog'
import PhotoCleanup from '../PhotoCleanup'
import { CLOUD_PHOTO_LIMIT } from '../../lib/storageStatus'
import { formatFileSize, getPhotoQuality, setPhotoQuality } from '../../utils/photoConfig'
import { Overlay, SettingsButton, SettingsRow } from './SettingsParts'

/**
 * 설정 「사진·저장 공간」: 사진 선명도, 쓴 공간, 오래된 사진 정리, 이 폰의 모든 기록 지우기.
 * 홈의 「사진 정리하기」로 들어오면(state.openCleanup) 정리 창을 바로 엶
 */
export default function StorageSetting({
  storage: { storageText, photoUsage, reload },
  workspaceCode,
  onWorkspaceCodeChange,
  onMessage,
  onError,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [showCleanup, setShowCleanup] = useState(() => Boolean(location.state?.openCleanup))
  const [photoQuality, setPhotoQualityState] = useState(getPhotoQuality())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const sharpPhotos = photoQuality >= 0.85

  function handleQualityChange(value) {
    setPhotoQuality(value)
    setPhotoQualityState(value)
  }

  async function handleDeleteAll() {
    setIsDeleting(true)
    onError(null)
    try {
      const { deleteAllData } = await import('../../utils/backup')
      await deleteAllData()
      onMessage(
        workspaceCode
          ? '이 폰의 기록을 모두 지우고 다른 폰과의 연결도 끊었어요'
          : '이 폰의 기록을 모두 지웠어요',
      )
      onWorkspaceCodeChange('')
      setShowDeleteConfirm(false)
      await reload()
    } catch (err) {
      onError(err instanceof Error ? err.message : '삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="p-4">
        <p className="label">사진 선명도</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQualityChange(0.72)}
            className={`chip ${!sharpPhotos ? 'chip-on' : ''}`}
            aria-pressed={!sharpPhotos}
          >
            보통
          </button>
          <button
            type="button"
            onClick={() => handleQualityChange(0.9)}
            className={`chip ${sharpPhotos ? 'chip-on' : ''}`}
            aria-pressed={sharpPhotos}
          >
            선명하게
          </button>
        </div>
        <p className="mt-2 text-[16px] font-semibold text-ink-soft">
          선명하게 하면 사진이 공간을 더 차지해요
        </p>
      </div>

      <SettingsRow label="이 폰에 쓰인 공간" description={storageText} />
      {photoUsage && (
        <SettingsRow
          label="사진"
          description={`${photoUsage.count}장 · ${formatFileSize(photoUsage.bytes)}${
            workspaceCode
              ? `\n같이 쓰는 무료 사진 공간 1GB 중 ${Math.round((photoUsage.bytes / CLOUD_PHOTO_LIMIT) * 100)}%`
              : ''
          }`}
        />
      )}
      <SettingsButton
        label="오래된 사진 정리"
        description="사진까지 백업한 뒤 오래된 상품 사진만 지워요"
        onClick={() => setShowCleanup(true)}
        trailing="›"
      />

      <SettingsButton
        label="이 폰의 모든 기록 지우기"
        description="되돌릴 수 없어요. 먼저 백업해 두세요"
        onClick={() => setShowDeleteConfirm(true)}
        danger
        trailing="›"
      />

      <Overlay>
        {showCleanup && (
          <PhotoCleanup
            onClose={() => {
              setShowCleanup(false)
              // 새로고침해도 다시 열리지 않게 「바로 열기」 표시를 지움
              if (location.state?.openCleanup) navigate('/settings', { replace: true })
            }}
            onDone={reload}
          />
        )}
        {showDeleteConfirm && (
          <ConfirmDialog
            title="정말 모두 지울까요?"
            description={
              workspaceCode
                ? '이 폰의 가게, 사입 기록, 사진이 모두 사라지고 다른 폰과의 연결도 끊겨요.\n다른 폰의 기록은 그대로예요. 백업 파일이 있으면 먼저 받아 두세요.'
                : '이 폰의 가게, 사입 기록, 사진이 모두 사라져요. 백업 파일이 있으면 먼저 받아 두세요.'
            }
            cancelLabel="그대로 두기"
            confirmLabel={isDeleting ? '지우는 중…' : '모두 지우기'}
            onConfirm={handleDeleteAll}
            onCancel={() => setShowDeleteConfirm(false)}
            danger
            disabled={isDeleting}
          />
        )}
      </Overlay>
    </>
  )
}
