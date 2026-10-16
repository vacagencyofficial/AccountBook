import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import ImportModeDialog from '../components/ImportModeDialog'
import { getPhotoQuality, MAX_LONG_EDGE, setPhotoQuality } from '../utils/photoConfig'
import { formatStorageEstimate } from '../utils/storage'

function isStandaloneApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export default function SettingsPage() {
  const fileInputRef = useRef(null)
  const [storageText, setStorageText] = useState('확인 중…')
  const [photoQuality, setPhotoQualityState] = useState(getPhotoQuality())
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [isInstalled] = useState(isStandaloneApp)

  useEffect(() => {
    loadStorage()
  }, [])

  async function loadStorage() {
    try {
      const { getStorageEstimate } = await import('../utils/backup')
      const { usage, quota } = await getStorageEstimate()
      setStorageText(formatStorageEstimate(usage, quota))
    } catch {
      setStorageText('확인 불가')
    }
  }

  async function handleExportBackup() {
    setIsExporting(true)
    setError(null)
    setMessage(null)
    try {
      const { exportBackup } = await import('../utils/backup')
      await exportBackup()
      setMessage('백업 파일을 다운로드했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 내보내기에 실패했습니다')
    } finally {
      setIsExporting(false)
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) setPendingFile(file)
  }

  async function handleImport(mode) {
    if (!pendingFile) return
    setIsImporting(true)
    setError(null)
    setMessage(null)
    try {
      const { importBackup } = await import('../utils/backup')
      await importBackup(pendingFile, mode)
      setMessage(mode === 'overwrite' ? '백업으로 덮어썼습니다.' : '백업을 병합했습니다.')
      setPendingFile(null)
      await loadStorage()
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 불러오기에 실패했습니다')
    } finally {
      setIsImporting(false)
    }
  }

  function handleQualityChange(event) {
    const value = parseInt(event.target.value, 10) / 100
    setPhotoQuality(value)
    setPhotoQualityState(value)
  }

  async function handleDeleteAll() {
    setIsDeleting(true)
    setError(null)
    try {
      const { deleteAllData } = await import('../utils/backup')
      await deleteAllData()
      setMessage('모든 데이터를 삭제했습니다.')
      setShowDeleteConfirm(false)
      await loadStorage()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Settings" title="설정" subtitle="백업·복원 및 앱 환경" />

      <section className="space-y-4 px-4 py-5">
        {message && (
          <div className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">{message}</div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={handleFileSelected}
        />

        <SettingsSection title="백업">
          <SettingsButton
            label="전체 백업 내보내기"
            description="data.json + photos/ 를 ZIP으로 저장"
            onClick={handleExportBackup}
            disabled={isExporting}
            trailing={isExporting ? '…' : '›'}
          />
          <SettingsButton
            label="백업 불러오기"
            description="덮어쓰기 또는 병합"
            onClick={handleImportClick}
            disabled={isImporting}
            trailing="›"
          />
        </SettingsSection>

        <SettingsSection title="앱">
          <SettingsRow
            label="PWA 설치 상태"
            description={
              isInstalled
                ? '홈 화면에 추가됨 — 데이터가 안정적으로 유지됩니다'
                : '브라우저 탭에서 실행 중 — iOS는 홈 화면 추가를 권장합니다'
            }
          />

          <div className="px-4 py-4">
            <p className="text-sm font-medium text-ink">사진 압축 품질</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {Math.round(photoQuality * 100)}% · 장변 {MAX_LONG_EDGE}px
            </p>
            <input
              type="range"
              min={50}
              max={95}
              step={1}
              value={Math.round(photoQuality * 100)}
              onChange={handleQualityChange}
              className="mt-3 w-full accent-brand"
            />
            <div className="mt-1 flex justify-between text-xs text-ink-muted">
              <span>50%</span>
              <span>95%</span>
            </div>
          </div>

          <SettingsRow label="저장 용량" description={storageText} />

          <SettingsButton
            label="데이터 전체 삭제"
            description="복구할 수 없습니다"
            onClick={() => setShowDeleteConfirm(true)}
            danger
            trailing="›"
          />
        </SettingsSection>

        <p className="text-center text-xs text-ink-muted">사입노트 · 현장 장부 v0.2.0</p>
      </section>

      {pendingFile && (
        <ImportModeDialog
          disabled={isImporting}
          onOverwrite={() => handleImport('overwrite')}
          onMerge={() => handleImport('merge')}
          onCancel={() => setPendingFile(null)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="모든 데이터를 삭제할까요?"
          description="가게, 사입 기록, 사진이 영구 삭제됩니다. 백업 파일이 있다면 먼저 내보내 두세요."
          confirmLabel={isDeleting ? '삭제 중…' : '삭제'}
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
          disabled={isDeleting}
        />
      )}
    </div>
  )
}

function SettingsSection({ title, children }) {
  return (
    <div>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {title}
      </h2>
      <ul className="overflow-hidden rounded-2xl border border-line bg-raised divide-y divide-line">
        {children}
      </ul>
    </div>
  )
}

function SettingsButton({ label, description, onClick, disabled, danger, trailing }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center justify-between px-4 py-4 text-left transition hover:bg-paper disabled:opacity-50"
      >
        <div>
          <p className={`text-sm font-medium ${danger ? 'text-red-600' : 'text-ink'}`}>
            {label}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
        </div>
        <span className={danger ? 'text-red-300' : 'text-ink-muted'}>{trailing}</span>
      </button>
    </li>
  )
}

function SettingsRow({ label, description }) {
  return (
    <li className="flex items-center justify-between px-4 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
      </div>
    </li>
  )
}
