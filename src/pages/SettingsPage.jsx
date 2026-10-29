import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import ImportModeDialog from '../components/ImportModeDialog'
import CloudInvitePanel from '../components/CloudInvitePanel'
import { getPhotoQuality, setPhotoQuality } from '../utils/photoConfig'
import { formatStorageEstimate } from '../utils/storage'
import InstallGuide from '../components/InstallGuide'
import BudgetSetting from '../components/BudgetSetting'
import { isCloudConfigured } from '../lib/supabase'
import { getWorkspaceCode, normalizeWorkspaceCode } from '../lib/workspace'
import { formatSyncTime, getSyncStatus } from '../lib/syncStatus'
import { getTextSize, setTextSize, TEXT_SIZES } from '../lib/textSize'

export default function SettingsPage() {
  const fileInputRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [storageText, setStorageText] = useState('확인 중…')
  const [photoQuality, setPhotoQualityState] = useState(getPhotoQuality())
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
  const [showRotateConfirm, setShowRotateConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [workspaceCode, setWorkspaceCode] = useState(getWorkspaceCode())
  const [codeInput, setCodeInput] = useState(getWorkspaceCode())
  const [isSyncing, setIsSyncing] = useState(false)
  const [showManualCode, setShowManualCode] = useState(false)

  useEffect(() => {
    loadStorage()
  }, [])

  useEffect(() => {
    if (searchParams.get('joined') === '1') {
      setMessage('초대받은 장부와 연결했어요')
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
      setMessage('백업 파일을 저장했어요')
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
      setMessage(mode === 'overwrite' ? '백업 내용으로 바꿨어요' : '백업 내용을 더했어요')
      setPendingFile(null)
      await loadStorage()
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 불러오기에 실패했습니다')
    } finally {
      setIsImporting(false)
    }
  }

  function handleQualityChange(value) {
    setPhotoQuality(value)
    setPhotoQualityState(value)
  }

  async function handleDeleteAll() {
    setIsDeleting(true)
    setError(null)
    try {
      const { deleteAllData } = await import('../utils/backup')
      await deleteAllData()
      setMessage(workspaceCode ? '이 폰의 기록을 모두 지우고 다른 폰과의 연결도 끊었어요' : '이 폰의 기록을 모두 지웠어요')
      setWorkspaceCode('')
      setCodeInput('')
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
      setMessage('준비됐어요. 아래 버튼으로 다른 폰에 초대를 보내 주세요')
    } catch (err) {
      setError(err instanceof Error ? err.message : '클라우드 연결에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleConnectCloud(localMode = 'keep') {
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
      const ws = await connectWorkspace(typed || undefined, { localMode })
      setWorkspaceCode(ws.code)
      setCodeInput(ws.code)
      await syncBidirectional()
      setMessage('연결했어요. 이제 같은 장부를 같이 봐요')
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
      setMessage('다른 폰과 맞췄어요')
    } catch (err) {
      setError(err instanceof Error ? err.message : '맞추기에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleRotateCode() {
    setShowRotateConfirm(false)
    setIsSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const { rotateWorkspaceCode } = await import('../db/cloudSync')
      const ws = await rotateWorkspaceCode()
      setWorkspaceCode(ws.code)
      setCodeInput(ws.code)
      setMessage('새 번호로 바꿨어요. 아래 「카톡·문자로 보내기」로 다른 폰에 새 초대를 보내 주세요')
    } catch (err) {
      setError(err instanceof Error ? err.message : '번호를 바꾸지 못했어요')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handlePullReplace() {
    setShowReplaceConfirm(false)
    if (!isCloudConfigured) return
    setIsSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const { pullCloudToLocal } = await import('../db/cloudSync')
      const result = await pullCloudToLocal({ replaceLocal: true })
      setMessage(`다른 폰 기록으로 바꿨어요 · 가게 ${result.shops}곳 · 기록 ${result.items}건`)
      await loadStorage()
    } catch (err) {
      setError(err instanceof Error ? err.message : '가져오기에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  const sharpPhotos = photoQuality >= 0.85

  return (
    <div>
      <PageHeader title="설정" />

      <section className="space-y-5 px-4 pb-6 pt-2">
        {message && (
          <div className="rounded-[10px] bg-good-soft px-4 py-3 text-[17px] font-bold text-good" aria-live="polite">
            ✓ {message}
          </div>
        )}
        {error && (
          <div className="rounded-[10px] bg-red-50 px-4 py-3 text-[17px] font-bold text-red-700" role="alert">
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

        <SettingsSection title="글씨 크기">
          <TextSizePicker />
        </SettingsSection>

        <SettingsSection title="한 달 예산">
          <BudgetSetting />
        </SettingsSection>

        <SettingsSection title="다른 폰과 같이 쓰기">
          <div className="space-y-3 p-4">
            {!isCloudConfigured ? (
              <p className="text-[17px] font-semibold leading-relaxed text-ink-muted">
                지금은 이 폰에만 저장되고 있어요. 다른 폰과 같이 쓰려면 도와주시는 분께 말씀해 주세요.
              </p>
            ) : !workspaceCode ? (
              <>
                <p className="text-[18px] font-extrabold text-ink">처음이면 여기만 누르세요</p>
                <p className="text-[16px] font-semibold leading-relaxed text-ink-muted">
                  번호는 외우지 않아도 돼요. 시작한 뒤 카톡으로 보내면 다른 폰이 따라와요.
                </p>
                <button type="button" onClick={handleStartCloud} disabled={isSyncing} className="btn btn-primary w-full">
                  {isSyncing ? '준비 중…' : '다른 폰과 같이 쓰기 시작'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualCode((v) => !v)}
                  className="btn w-full text-[17px] font-bold text-brand"
                >
                  {showManualCode ? '닫기' : '받은 초대 번호가 있어요'}
                </button>
              </>
            ) : (
              <>
                <p className="text-[18px] font-extrabold text-good">✓ 다른 폰과 같이 쓰는 중</p>
                <SyncStatusLine />
                {/^SAILP-[A-Z0-9]{6}$/.test(workspaceCode) && (
                  <div className="space-y-2 rounded-[12px] bg-warn-soft p-3">
                    <p className="text-[16px] font-bold leading-snug text-warn">
                      지금 장부 번호는 짧아서 남이 짐작하기 쉬워요. 더 안전한 새 번호로 바꾸는 걸 추천해요.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowRotateConfirm(true)}
                      disabled={isSyncing}
                      className="btn btn-outline w-full"
                    >
                      새 번호로 바꾸기
                    </button>
                  </div>
                )}
                <CloudInvitePanel code={workspaceCode} disabled={isSyncing} />
                <button type="button" onClick={handleSyncNow} disabled={isSyncing} className="btn btn-primary w-full">
                  {isSyncing ? '맞추는 중…' : '지금 맞추기'}
                </button>
                <p className="text-[16px] font-semibold text-ink-soft">다른 폰과 최신 기록을 맞춰요. 평소에는 자동으로 맞춰져요.</p>
                <div className="flex flex-wrap gap-x-4">
                  <button
                    type="button"
                    onClick={() => setShowReplaceConfirm(true)}
                    disabled={isSyncing}
                    className="min-h-[3rem] text-[16px] font-bold text-ink-muted underline"
                  >
                    다른 폰 기록으로 바꾸기
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualCode((v) => !v)}
                    className="min-h-[3rem] text-[16px] font-bold text-ink-muted underline"
                  >
                    {showManualCode ? '닫기' : '초대 번호 직접 넣기'}
                  </button>
                </div>
              </>
            )}

            {isCloudConfigured && showManualCode && (
              <div className="space-y-2.5 rounded-[12px] bg-wash p-3">
                <label className="label" htmlFor="workspace-code">
                  초대 번호
                </label>
                <input
                  id="workspace-code"
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="SAILP-XXXXXXXXXX"
                  className="field"
                />
                {workspaceCode && normalizeWorkspaceCode(codeInput) !== workspaceCode ? (
                  <>
                    <p className="text-[16px] font-bold leading-snug text-ink-muted">
                      다른 장부로 바꿔요. 이 폰 기록은 어떻게 할까요?
                    </p>
                    <button
                      type="button"
                      onClick={() => handleConnectCloud('keep')}
                      disabled={isSyncing}
                      className="btn btn-primary w-full"
                    >
                      이 폰 기록도 함께 옮기기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConnectCloud('discard')}
                      disabled={isSyncing}
                      className="btn btn-outline w-full"
                    >
                      이 폰 기록은 지우고 그 장부만 보기
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConnectCloud('keep')}
                    disabled={isSyncing}
                    className="btn btn-primary w-full"
                  >
                    이 번호로 연결
                  </button>
                )}
              </div>
            )}
          </div>
        </SettingsSection>

        <SettingsSection title="기록 챙기기">
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
            onClick={handleImportClick}
            disabled={isImporting}
            trailing="›"
          />
        </SettingsSection>

        <SettingsSection title="홈 화면에 추가">
          <InstallGuide />
        </SettingsSection>

        <SettingsSection title="사진·저장 공간">
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
            <p className="mt-2 text-[16px] font-semibold text-ink-soft">선명하게 하면 사진이 공간을 더 차지해요</p>
          </div>

          <SettingsRow label="이 폰에 쓰인 공간" description={storageText} />

          <SettingsButton
            label="이 폰의 모든 기록 지우기"
            description="되돌릴 수 없어요. 먼저 백업해 두세요"
            onClick={() => setShowDeleteConfirm(true)}
            danger
            trailing="›"
          />
        </SettingsSection>

        <SettingsSection title="도움">
          <Link to="/help" className="flex min-h-[4rem] items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[18px] font-bold text-ink">도움말</p>
              <p className="mt-0.5 text-[16px] font-semibold text-ink-soft">자주 묻는 것과 쓰는 방법</p>
            </div>
            <span className="text-[24px] text-ink-soft" aria-hidden>
              ›
            </span>
          </Link>
          <SettingsRow
            label="앱 정보"
            description={`사입노트 ${import.meta.env.VITE_APP_VERSION} · ${import.meta.env.VITE_BUILD_DATE} 업데이트`}
          />
        </SettingsSection>
      </section>

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

      {showRotateConfirm && (
        <ConfirmDialog
          title="장부 번호를 바꿀까요?"
          description={'바꾸면 같이 쓰던 다른 폰은 연결이 끊겨요.\n바꾼 뒤 새 초대 주소를 다시 보내 주세요. 기록은 그대로예요.'}
          cancelLabel="그대로 두기"
          confirmLabel="바꾸기"
          onConfirm={handleRotateCode}
          onCancel={() => setShowRotateConfirm(false)}
        />
      )}

      {showReplaceConfirm && (
        <ConfirmDialog
          title="다른 폰 기록으로 바꿀까요?"
          description={'이 폰의 기록을 지우고, 인터넷에 맞춰 둔 기록으로 채워요.\n이 폰에서만 적고 아직 안 맞춘 기록은 사라질 수 있어요.'}
          cancelLabel="그대로 두기"
          confirmLabel="바꾸기"
          onConfirm={handlePullReplace}
          onCancel={() => setShowReplaceConfirm(false)}
          danger
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
    </div>
  )
}

function TextSizePicker() {
  const [size, setSize] = useState(getTextSize)
  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        {TEXT_SIZES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setTextSize(item.value)
              setSize(item.value)
            }}
            className={`chip ${size === item.value ? 'chip-on' : ''}`}
            aria-pressed={size === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[16px] font-semibold text-ink-soft">모든 화면의 글씨와 버튼이 함께 커져요</p>
    </div>
  )
}

function SyncStatusLine() {
  const { lastSyncedAt, failed } = getSyncStatus()
  if (failed) {
    return (
      <p className="rounded-[10px] bg-warn-soft px-3 py-2 text-[16px] font-bold leading-snug text-warn">
        최근에 맞추지 못했어요. 기록은 이 폰에 잘 있고, 인터넷이 되면 「지금 맞추기」를 눌러 주세요.
      </p>
    )
  }
  if (!lastSyncedAt) return null
  return <p className="text-[16px] font-semibold text-ink-soft">마지막으로 맞춘 때: {formatSyncTime(lastSyncedAt)}</p>
}

function SettingsSection({ title, children }) {
  return (
    <div>
      <h2 className="mb-2 px-0.5 text-[18px] font-extrabold text-ink">{title}</h2>
      <div className="card divide-y divide-line-soft overflow-hidden">{children}</div>
    </div>
  )
}

function SettingsButton({ label, description, onClick, disabled, danger, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[4rem] w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:opacity-50"
    >
      <div>
        <p className={`text-[18px] font-bold ${danger ? 'text-red-700' : 'text-ink'}`}>{label}</p>
        <p className="mt-0.5 text-[16px] font-semibold text-ink-soft">{description}</p>
      </div>
      <span className="text-[24px] text-ink-soft" aria-hidden>
        {trailing}
      </span>
    </button>
  )
}

function SettingsRow({ label, description }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[18px] font-bold text-ink">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-[16px] font-semibold leading-snug text-ink-soft">{description}</p>
    </div>
  )
}
