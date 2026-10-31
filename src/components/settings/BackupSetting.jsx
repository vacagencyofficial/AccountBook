import { useRef, useState } from 'react'
import ImportModeDialog from '../ImportModeDialog'
import { Overlay, SettingsButton } from './SettingsParts'

/** 설정 「기록 챙기기」: 사진 포함 백업하기, 백업에서 되살리기 */
export default function BackupSetting({ onMessage, onError, onStorageChanged }) {
  const fileInputRef = useRef(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)

  async function handleExportBackup() {
    setIsExporting(true)
    onError(null)
    onMessage(null)
    try {
      const { exportBackup } = await import('../../utils/backup')
      await exportBackup()
      onMessage('백업 파일을 저장했어요')
    } catch (err) {
      onError(err instanceof Error ? err.message : '백업 내보내기에 실패했습니다')
    } finally {
      setIsExporting(false)
    }
  }

  function handleFileSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) setPendingFile(file)
  }

  async function handleImport(mode) {
    if (!pendingFile) return
    setIsImporting(true)
    onError(null)
    onMessage(null)
    try {
      const { importBackup } = await import('../../utils/backup')
      await importBackup(pendingFile, mode)
      onMessage(mode === 'overwrite' ? '백업 내용으로 바꿨어요' : '백업 내용을 더했어요')
      setPendingFile(null)
      await onStorageChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : '백업 불러오기에 실패했습니다')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <SettingsButton
        label="사진 포함 백업하기"
        description="모든 기록을 사진까지 한 파일로 저장해요"
        onClick={handleExportBackup}
        disabled={isExporting}
        trailing={isExporting ? '…' : '›'}
      />
      <SettingsButton
        label="백업에서 되살리기"
        description="저장해 둔 백업 파일로 기록을 되살려요"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        trailing="›"
      />
      <Overlay>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={handleFileSelected}
        />
        {pendingFile && (
          <ImportModeDialog
            title="백업에서 되살리기"
            description="「지금 기록에 더하기」는 있던 기록에 백업 내용을 더해요. 「지금 기록 지우고 바꾸기」는 장부를 비우고 백업 내용으로 채워요."
            disabled={isImporting}
            onOverwrite={() => handleImport('overwrite')}
            onMerge={() => handleImport('merge')}
            onCancel={() => setPendingFile(null)}
          />
        )}
      </Overlay>
    </>
  )
}
