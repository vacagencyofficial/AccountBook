import { useState } from 'react'
import ConfirmDialog from '../ConfirmDialog'
import { Overlay } from './SettingsParts'
import CloudInvitePanel from '../CloudInvitePanel'
import { isCloudConfigured } from '../../lib/supabase'
import { normalizeWorkspaceCode } from '../../lib/workspace'
import { formatSyncTime, getSyncStatus } from '../../lib/syncStatus'

/**
 * 설정 「다른 폰과 같이 쓰기」: 시작·초대·지금 맞추기·번호 바꾸기·다른 폰 기록으로 바꾸기·초대 번호 넣기.
 * 알림 문구는 설정 화면 맨 위에 보이도록 onMessage·onError로 올림
 */
export default function CloudSyncSetting({
  workspaceCode,
  onWorkspaceCodeChange,
  onMessage,
  onError,
  onStorageChanged,
}) {
  const [codeInput, setCodeInput] = useState(workspaceCode)
  const [shownCode, setShownCode] = useState(workspaceCode)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showManualCode, setShowManualCode] = useState(false)
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
  const [showRotateConfirm, setShowRotateConfirm] = useState(false)

  // 장부 번호가 바뀌면(연결·번호 바꾸기·모두 지우기) 입력칸도 그 번호로
  if (shownCode !== workspaceCode) {
    setShownCode(workspaceCode)
    setCodeInput(workspaceCode)
  }

  function begin() {
    setIsSyncing(true)
    onError(null)
    onMessage(null)
  }

  async function handleStartCloud() {
    if (!isCloudConfigured) {
      onError('클라우드 키가 아직 앱에 연결되어 있지 않습니다. 배포 환경 변수를 설정해 주세요.')
      return
    }
    begin()
    try {
      const { connectWorkspace, syncBidirectional } = await import('../../db/cloudSync')
      // 코드 입력 없이 새 장부 생성 또는 기존 연결 유지
      const ws = await connectWorkspace(workspaceCode || undefined)
      onWorkspaceCodeChange(ws.code)
      await syncBidirectional()
      onMessage('준비됐어요. 아래 버튼으로 다른 폰에 초대를 보내 주세요')
    } catch (err) {
      onError(err instanceof Error ? err.message : '클라우드 연결에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleConnectCloud(localMode = 'keep') {
    if (!isCloudConfigured) {
      onError('클라우드 키가 아직 앱에 연결되어 있지 않습니다. 배포 환경 변수를 설정해 주세요.')
      return
    }
    const typed = normalizeWorkspaceCode(codeInput)
    begin()
    try {
      const { connectWorkspace, syncBidirectional } = await import('../../db/cloudSync')
      const ws = await connectWorkspace(typed || undefined, { localMode })
      onWorkspaceCodeChange(ws.code)
      await syncBidirectional()
      onMessage('연결했어요. 이제 같은 장부를 같이 봐요')
      setShowManualCode(false)
    } catch (err) {
      onError(err instanceof Error ? err.message : '클라우드 연결에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleSyncNow() {
    if (!isCloudConfigured || !workspaceCode) return
    begin()
    try {
      const { syncBidirectional } = await import('../../db/cloudSync')
      await syncBidirectional()
      onMessage('다른 폰과 맞췄어요')
    } catch (err) {
      onError(err instanceof Error ? err.message : '맞추기에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleRotateCode() {
    setShowRotateConfirm(false)
    begin()
    try {
      const { rotateWorkspaceCode } = await import('../../db/cloudSync')
      const ws = await rotateWorkspaceCode()
      onWorkspaceCodeChange(ws.code)
      onMessage('새 번호로 바꿨어요. 아래 「카톡·문자로 보내기」로 다른 폰에 새 초대를 보내 주세요')
    } catch (err) {
      onError(err instanceof Error ? err.message : '번호를 바꾸지 못했어요')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handlePullReplace() {
    setShowReplaceConfirm(false)
    if (!isCloudConfigured) return
    begin()
    try {
      const { pullCloudToLocal } = await import('../../db/cloudSync')
      const result = await pullCloudToLocal({ replaceLocal: true })
      onMessage(`다른 폰 기록으로 바꿨어요 · 가게 ${result.shops}곳 · 기록 ${result.items}건`)
      await onStorageChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : '가져오기에 실패했습니다')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <>
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
            <button
              type="button"
              onClick={handleStartCloud}
              disabled={isSyncing}
              className="btn btn-primary w-full"
            >
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
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="btn btn-primary w-full"
            >
              {isSyncing ? '맞추는 중…' : '지금 맞추기'}
            </button>
            <p className="text-[16px] font-semibold text-ink-soft">
              다른 폰과 최신 기록을 맞춰요. 평소에는 자동으로 맞춰져요.
            </p>
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

      {showRotateConfirm && (
        <Overlay>
          <ConfirmDialog
            title="장부 번호를 바꿀까요?"
            description={
              '바꾸면 같이 쓰던 다른 폰은 연결이 끊겨요.\n바꾼 뒤 새 초대 주소를 다시 보내 주세요. 기록은 그대로예요.'
            }
            cancelLabel="그대로 두기"
            confirmLabel="바꾸기"
            onConfirm={handleRotateCode}
            onCancel={() => setShowRotateConfirm(false)}
          />
        </Overlay>
      )}

      {showReplaceConfirm && (
        <Overlay>
          <ConfirmDialog
            title="다른 폰 기록으로 바꿀까요?"
            description={
              '이 폰의 기록을 지우고, 인터넷에 맞춰 둔 기록으로 채워요.\n이 폰에서만 적고 아직 안 맞춘 기록은 사라질 수 있어요.'
            }
            cancelLabel="그대로 두기"
            confirmLabel="바꾸기"
            onConfirm={handlePullReplace}
            onCancel={() => setShowReplaceConfirm(false)}
            danger
          />
        </Overlay>
      )}
    </>
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
  return (
    <p className="text-[16px] font-semibold text-ink-soft">
      마지막으로 맞춘 때: {formatSyncTime(lastSyncedAt)}
    </p>
  )
}
