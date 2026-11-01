import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../ConfirmDialog'
import { Overlay, SettingsButton, SettingsRow } from './SettingsParts'
import { describeUser, isAuthAvailable } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'

/** 설정 「계정」: 로그인 상태 · 로그아웃 · 회원 탈퇴 */
export default function AccountSetting({ onMessage, onError, onSignedOut }) {
  const navigate = useNavigate()
  const { loading, user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'logout' | 'delete'

  if (!isAuthAvailable) {
    return (
      <SettingsRow label="로그인" description="클라우드 설정(Supabase 키)이 있어야 로그인할 수 있어요." />
    )
  }
  if (loading) return <SettingsRow label="계정" description="확인하는 중…" />

  if (!user) {
    return (
      <SettingsButton
        label="로그인하기"
        description="카카오·Google·Apple로 1초 만에. 폰을 바꿔도 장부가 그대로예요"
        onClick={() => navigate('/login')}
        trailing="›"
      />
    )
  }

  const info = describeUser(user)

  async function run(kind) {
    setConfirm(null)
    setBusy(true)
    onError(null)
    onMessage(null)
    try {
      const account = await import('../../db/account')
      if (kind === 'logout') {
        await account.signOutAndForget()
        onMessage('로그아웃했어요. 다시 로그인하면 장부가 그대로 열려요')
      } else {
        await account.deleteAccount()
        onMessage('탈퇴했어요. 그동안 써 주셔서 고마워요')
      }
      await onSignedOut?.()
    } catch (err) {
      onError(err instanceof Error ? err.message : '처리하지 못했어요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SettingsRow
        label={info.name ? `${info.name}님` : '로그인됨'}
        description={[info.providerName && `${info.providerName} 계정`, info.email]
          .filter(Boolean)
          .join(' · ')}
      />
      <SettingsButton
        label="로그아웃"
        description="이 폰의 기록은 지워지고, 계정 장부는 클라우드에 남아요"
        onClick={() => setConfirm('logout')}
        disabled={busy}
        trailing="›"
      />
      <SettingsButton
        label="회원 탈퇴"
        description="계정과 혼자 쓰던 장부·사진을 모두 지워요"
        onClick={() => setConfirm('delete')}
        disabled={busy}
        danger
        trailing="›"
      />
      {confirm && (
        <Overlay>
          <ConfirmDialog
            title={confirm === 'logout' ? '로그아웃할까요?' : '정말 탈퇴할까요?'}
            description={
              confirm === 'logout'
                ? '아직 올리지 않은 기록을 먼저 올린 뒤, 이 폰의 기록을 지워요.\n다시 로그인하면 그대로 불러와요.'
                : '계정과 혼자 쓰던 장부·사진이 모두 지워지고 되돌릴 수 없어요.\n다른 계정과 같이 쓰는 장부는 남고, 내 연결만 끊겨요.\n(로그인 없이 초대 번호로만 같이 쓰던 폰에서도 사라져요)\n필요하면 먼저 「기록 챙기기」에서 백업해 주세요.'
            }
            confirmLabel={confirm === 'logout' ? '로그아웃' : '탈퇴하기'}
            danger={confirm === 'delete'}
            disabled={busy}
            onConfirm={() => run(confirm)}
            onCancel={() => setConfirm(null)}
          />
        </Overlay>
      )}
    </>
  )
}
