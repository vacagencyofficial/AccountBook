import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import ImportModeDialog from '../components/ImportModeDialog'
import CloudInvitePanel from '../components/CloudInvitePanel'
import { getPhotoQuality, MAX_LONG_EDGE, setPhotoQuality } from '../utils/photoConfig'
import { formatStorageEstimate } from '../utils/storage'
import { isCloudConfigured } from '../lib/supabase'
import { getWorkspaceCode, normalizeWorkspaceCode } from '../lib/workspace'

function isStandaloneApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export default function SettingsPage() {
  const fileInputRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [showManualCode, setShowManualCode] = useState(false)

  useEffect(() => {
    loadStorage()
  }, [])

  useEffect(() => {
    if (searchParams.get('joined') === '1') {
      setMessage('다른 기기에서 보낸 초대로 장부가 연결되었습니다.')
      setWorkspaceCode(getWorkspaceCode())
      setCodeInput(getWorkspaceCode())
      const next = new URLSearchParams(searchParams)
      next.delete('joined')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

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

  async function handleStartCloud() {
    if (!isCloudConfigured) {
      setError('클라우드 키가 아직 앱에 연결되어 있지 않습니다. 배포 환경 변수를 설정해 주세요.')
      return
    }
    setIsSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const { connectWorkspace, syncBidirectional } = await import('../db/cloudSync')
      // 코드 입력 없이 새 장부 생성 또는 기존 연결 유지
      const ws = await connectWorkspace(workspaceCode || undefined)
      setWorkspaceCode(ws.code)
      setCodeInput(ws.code)
      await syncBidirectional()
      setMessage('잘 저장해 두었습니다. 아래 버튼으로 다른 폰을 불러 주세요.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '클라우드 연결에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleConnectCloud() {
    if (!isCloudConfigured) {
      setError('클라우드 키가 아직 앱에 연결되어 있지 않습니다. 배포 환경 변수를 설정해 주세요.')
      return
    }
    const typed = normalizeWorkspaceCode(codeInput)
    setIsSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const { connectWorkspace, syncBidirectional } = await import('../db/cloudSync')
      const ws = await connectWorkspace(typed || undefined)
      setWorkspaceCode(ws.code)
      setCodeInput(ws.code)
      await syncBidirectional()
      setMessage('연결했어요. 이제 같은 장부를 같이 볼 수 있습니다.')
      setShowManualCode(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '클라우드 연결에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleSyncNow() {
    if (!isCloudConfigured || !workspaceCode) return
    setIsSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const { syncBidirectional } = await import('../db/cloudSync')
      await syncBidirectional()
      setMessage('이 폰과 인터넷 저장을 맞춰 두었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '맞추기에 실패했습니다')
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
      setMessage(`인터넷에서 가져왔어요 · 가게 ${result.shops}곳 · 기록 ${result.items}개`)
      await loadStorage()
    } catch (err) {
      setError(err instanceof Error ? err.message : '가져오기에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div>
      <PageHeader title="설정" subtitle="다른 폰과 함께 쓰고, 기록을 안전하게 챙기세요" tone="brand" />

      <section className="space-y-4 px-4 py-5">
        {message && (
          <div className=" border-2 border-good/40 bg-good-soft px-4 py-3 text-[16px] font-black text-good">
            {message}
          </div>
        )}
        {error && (
          <div className=" border-2 border-red-300 bg-red-50 px-4 py-3 text-[16px] font-black text-red-700">
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

        <SettingsSection title="다른 폰과 같이 쓰기" tone="brand">
          <li className="space-y-3 py-3.5">
            {!isCloudConfigured ? (
              <p className="text-[15px] font-bold leading-relaxed text-ink-muted">
                아직 인터넷 저장이 준비되지 않았어요. 도와주시는 분께 「서버 키」를 넣어 달라고 해 주세요.
              </p>
            ) : !workspaceCode ? (
              <>
                <p className="text-[17px] font-black text-ink">처음이면 여기만 누르세요</p>
                <p className="text-[15px] font-semibold leading-relaxed text-ink-muted">
                  어려운 번호는 외우지 않아도 됩니다. 시작한 뒤 카톡으로 보내면 다른 폰이 따라옵니다.
                </p>
                <button
                  type="button"
                  onClick={handleStartCloud}
                  disabled={isSyncing}
                  className="tap-target w-full bg-brand text-[18px] font-black text-white disabled:opacity-50"
                >
                  {isSyncing ? '준비 중…' : '이 장부 인터넷에 맡기기'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualCode((v) => !v)}
                  className="text-[15px] font-bold text-ink-muted underline"
                >
                  {showManualCode ? '닫기' : '누가 보낸 번호가 있나요?'}
                </button>
              </>
            ) : (
              <>
                <p className="text-[16px] font-black text-good">연결되어 있어요</p>
                <CloudInvitePanel code={workspaceCode} disabled={isSyncing} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="tap-target flex-1 bg-brand text-[15px] font-black text-white disabled:opacity-50"
                  >
                    {isSyncing ? '맞추는 중…' : '지금 맞추기'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePullReplace}
                    disabled={isSyncing}
                    className="tap-target flex-1 border-2 border-line text-[15px] font-bold text-ink disabled:opacity-50"
                  >
                    인터넷 내용으로 채우기
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualCode((v) => !v)}
                  className="text-[14px] font-bold text-ink-muted underline"
                >
                  {showManualCode ? '닫기' : '번호로 직접 연결 (거의 안 씀)'}
                </button>
              </>
            )}

            {isCloudConfigured && showManualCode && (
              <div className="space-y-2 border-2 border-dashed border-line bg-wash p-3">
                <p className="text-[14px] font-bold text-ink-muted">번호 직접 넣기</p>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="SAILP-XXXXXX"
                  className="tap-target w-full border-2 border-line bg-paper px-3 text-[16px] font-bold outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={handleConnectCloud}
                  disabled={isSyncing}
                  className="tap-target w-full border-2 border-brand text-[15px] font-bold text-brand disabled:opacity-50"
                >
                  이 번호로 연결
                </button>
              </div>
            )}
          </li>
        </SettingsSection>

        <SettingsSection title="홈 화면에 붙여 두기">
          <SettingsRow
            label={isInstalled ? '이미 붙여 두셨어요' : '아직 홈 화면에 없어요'}
            description={
              isInstalled
                ? '아이콘을 눌러 바로 열 수 있습니다'
                : '폰 메뉴의 「공유」→「홈 화면에 추가」를 눌러 주세요'
            }
          />
        </SettingsSection>

        <SettingsSection title="기록 통째로 챙기기" tone="warn">
          <SettingsButton
            label="모든 기록 보관하기"
            description="사진까지 한 파일로 저장"
            onClick={handleExportBackup}
            disabled={isExporting}
            trailing={isExporting ? '…' : '›'}
          />
          <SettingsButton
            label="보관한 파일 다시 열기"
            description="지우고 채우거나, 합칠 수 있어요"
            onClick={handleImportClick}
            disabled={isImporting}
            trailing="›"
          />
        </SettingsSection>

        <SettingsSection title="사진·저장 공간">
          <div className="px-0 py-4">
            <p className="text-[16px] font-black text-ink">사진 선명도</p>
            <p className="mt-0.5 text-[14px] font-semibold text-ink-muted">
              지금 {Math.round(photoQuality * 100)}% (높을수록 용량이 커요)
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

          <SettingsRow label="이 폰에 쓰인 공간" description={storageText} />

          <SettingsButton
            label="모든 기록 지우기"
            description="다시 되돌릴 수 없어요. 먼저 보관하세요"
            onClick={() => setShowDeleteConfirm(true)}
            danger
            trailing="›"
          />
        </SettingsSection>

        <p className="text-center text-[14px] font-bold text-ink-muted">사입노트 · 천천히 쓰셔도 됩니다</p>
      </section>

      {pendingFile && (
        <ImportModeDialog
          title="보관한 파일 다시 열기"
          description="「지우고 덮어쓰기」는 지금 장부를 비우고 채웁니다. 「기존에 합치기」는 있던 기록에 더합니다."
          disabled={isImporting}
          onOverwrite={() => handleImport('overwrite')}
          onMerge={() => handleImport('merge')}
          onCancel={() => setPendingFile(null)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="정말 모두 지울까요?"
          description="가게, 사입 기록, 사진이 사라집니다. 보관한 파일이 있으면 먼저 받아 두세요."
          confirmLabel={isDeleting ? '지우는 중…' : '지우기'}
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
          disabled={isDeleting}
        />
      )}
    </div>
  )
}

function SettingsSection({ title, children, tone }) {
  const rail =
    tone === 'brand' ? 'tone-rail-brand border-brand/35' : tone === 'warn' ? 'tone-rail-accent border-warn/40' : 'border-line'
  return (
    <div>
      <h2 className="mb-2 text-[14px] font-black text-ink">{title}</h2>
      <ul className={`divide-y-2 divide-line border-2 bg-paper px-4 ${rail}`}>{children}</ul>
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
          <p className={`text-[16px] font-black ${danger ? 'text-red-600' : 'text-ink'}`}>{label}</p>
          <p className="mt-0.5 text-[14px] font-semibold text-ink-muted">{description}</p>
        </div>
        <span className="text-[20px] text-ink-muted">{trailing}</span>
      </button>
    </li>
  )
}

function SettingsRow({ label, description }) {
  return (
    <li className="py-3.5">
      <p className="text-[16px] font-black text-ink">{label}</p>
      <p className="mt-0.5 text-[14px] font-semibold leading-snug text-ink-muted">{description}</p>
    </li>
  )
}
