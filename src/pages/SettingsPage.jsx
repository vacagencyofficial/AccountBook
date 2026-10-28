import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import ImportModeDialog from '../components/ImportModeDialog'
import { getPhotoQuality, MAX_LONG_EDGE, setPhotoQuality } from '../utils/photoConfig'
import { formatStorageEstimate } from '../utils/storage'
import { isCloudConfigured } from '../lib/supabase'
import { getWorkspaceCode } from '../lib/workspace'

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
  const [workspaceCode, setWorkspaceCode] = useState(getWorkspaceCode())
  const [codeInput, setCodeInput] = useState(getWorkspaceCode())
  const [isSyncing, setIsSyncing] = useState(false)

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

  async function handleConnectCloud() {
    if (!isCloudConfigured) {
      setError('클라우드 키가 아직 앱에 연결되어 있지 않습니다. 배포 환경 변수를 설정해 주세요.')
      return
    }
    setIsSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const { connectWorkspace, syncBidirectional } = await import('../db/cloudSync')
      const ws = await connectWorkspace(codeInput || undefined)
      setWorkspaceCode(ws.code)
      setCodeInput(ws.code)
      const result = await syncBidirectional()
      setMessage(
        result.skipped
          ? `워크스페이스 ${ws.code} 연결됨 (동기화 대기)`
          : `클라우드 동기화 완료 · 코드 ${ws.code}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '클라우드 연결에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handlePullReplace() {
    if (!isCloudConfigured) return
    setIsSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const { pullCloudToLocal } = await import('../db/cloudSync')
      const result = await pullCloudToLocal({ replaceLocal: true })
      setMessage(`클라우드 데이터로 가져옴 · 가게 ${result.shops} · 기록 ${result.items}`)
      await loadStorage()
    } catch (err) {
      setError(err instanceof Error ? err.message : '가져오기에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div>
      <PageHeader title="설정" subtitle="클라우드 · 백업 · PWA" tone="brand" />

      <section className="space-y-4 px-4 py-5">
        {message && (
          <div className="rounded-2xl border-2 border-good/30 bg-good-soft px-4 py-3 text-[15px] font-bold text-good">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-[15px] font-bold text-red-700">
            {error}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={handleFileSelected}
        />

        <SettingsSection title="클라우드 (Supabase 무료)">
          <li className="space-y-3 py-3.5">
            <p className="text-[15px] font-bold text-ink">
              상태:{' '}
              {isCloudConfigured
                ? workspaceCode
                  ? `연결됨 · ${workspaceCode}`
                  : '키 있음 · 코드 연결 필요'
                : '아직 미연결 (환경 변수 필요)'}
            </p>
            <p className="text-[13px] font-medium text-ink-muted">
              같은 코드를 다른 폰/PC에 입력하면 데이터가 같이 보입니다.
            </p>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="SAILP-XXXXXX (비우면 새로 생성)"
              className="tap-target w-full rounded-xl border-2 border-line bg-wash px-3 text-[16px] font-bold outline-none focus:border-brand focus:bg-paper"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConnectCloud}
                disabled={isSyncing}
                className="tap-target flex-1 rounded-xl bg-brand text-[15px] font-black text-white disabled:opacity-50"
              >
                {isSyncing ? '동기화 중…' : '연결 · 동기화'}
              </button>
              <button
                type="button"
                onClick={handlePullReplace}
                disabled={isSyncing || !isCloudConfigured}
                className="tap-target flex-1 rounded-xl border-2 border-line text-[15px] font-bold text-ink disabled:opacity-50"
              >
                클라우드에서 가져오기
              </button>
            </div>
          </li>
        </SettingsSection>

        <SettingsSection title="PWA 설치">
          <SettingsRow
            label="설치 상태"
            description={
              isInstalled
                ? '홈 화면에 추가됨 — 앱처럼 사용 중'
                : 'Safari/Chrome에서 공유 → 홈 화면에 추가'
            }
          />
        </SettingsSection>

        <SettingsSection title="백업">
          <SettingsButton
            label="전체 백업 내보내기"
            description="ZIP으로 저장"
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
          <div className="px-0 py-4">
            <p className="text-[15px] font-bold text-ink">사진 압축 품질</p>
            <p className="mt-0.5 text-[13px] text-ink-muted">
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

        <p className="text-center text-[13px] text-ink-muted">사입노트 v0.3.0 · PWA + Cloud</p>
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
      <h2 className="mb-2 text-[13px] font-black text-ink-muted">{title}</h2>
      <ul className="divide-y-2 divide-line rounded-2xl border-2 border-line bg-paper px-4">{children}</ul>
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
        className="flex w-full items-center justify-between py-3.5 text-left disabled:opacity-50"
      >
        <div>
          <p className={`text-[15px] font-bold ${danger ? 'text-red-600' : 'text-ink'}`}>{label}</p>
          <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>
        </div>
        <span className="text-ink-muted">{trailing}</span>
      </button>
    </li>
  )
}

function SettingsRow({ label, description }) {
  return (
    <li className="py-3.5">
      <p className="text-[15px] font-bold text-ink">{label}</p>
      <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>
    </li>
  )
}
