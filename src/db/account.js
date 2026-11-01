import { supabase } from '../lib/supabase'
import { getWorkspaceCode, normalizeWorkspaceCode, setWorkspaceLocal } from '../lib/workspace'
import { getSession } from '../lib/auth'
import { connectWorkspace, forgetThisDevice, hasLocalRecords, rpc, syncBidirectional } from './cloudSync'

/**
 * 로그인 직후: 계정과 이 폰의 장부를 맞춤
 * - 계정 장부가 있고 이 폰도 그 장부 → 맞추기만
 * - 계정 장부가 있는데 이 폰에 다른 장부·기록이 있음 → { status: 'choose' } (화면에서 물어봄)
 * - 계정 장부가 없고 이 폰이 장부 번호를 쓰던 중 → 그 장부를 계정에 연결
 * - 둘 다 없음 → 계정에 새 장부를 만들고 이 폰 기록을 올림
 */
export async function linkAccountWorkspace() {
  const mine = await rpc('sailp_my_workspace')
  const localCode = normalizeWorkspaceCode(getWorkspaceCode())

  if (mine) {
    if (localCode === mine.code) {
      await syncBidirectional()
      return { status: 'synced', workspace: mine }
    }
    if (localCode || (await hasLocalRecords())) {
      return { status: 'choose', workspace: mine, previousCode: localCode }
    }
    await connectWorkspace(mine.code)
    await syncBidirectional()
    return { status: 'opened', workspace: mine }
  }

  if (localCode) {
    const linked = await rpc('sailp_link_workspace', { p_code: localCode })
    await syncBidirectional()
    return { status: 'linked', workspace: linked }
  }

  const created = await rpc('sailp_create_my_workspace')
  setWorkspaceLocal({ code: created.code, id: created.id })
  await syncBidirectional()
  return { status: 'created', workspace: created }
}

/** 'choose'에서 고른 뒤: 계정 장부로 바꿈 (keep = 이 폰 기록도 합치기, discard = 지우기) */
export async function openAccountWorkspace(code, localMode) {
  await connectWorkspace(code, { localMode })
  await syncBidirectional()
}

/** 초대 링크로 연결한 장부를 로그인한 계정에도 연결 (로그인 안 했으면 아무것도 안 함) */
export async function linkCurrentWorkspaceToAccount() {
  const code = getWorkspaceCode()
  if (!code || !(await getSession())) return null
  return rpc('sailp_link_workspace', { p_code: code })
}

/** 로그아웃: 남은 변경을 올린 뒤 이 폰 기록을 지움 (계정 장부는 클라우드에 그대로) */
export async function signOutAndForget() {
  try {
    if (getWorkspaceCode()) await syncBidirectional()
  } catch (err) {
    throw new Error(
      `아직 올리지 못한 기록이 있어 로그아웃을 멈췄어요. 인터넷 연결을 확인해 주세요. (${err instanceof Error ? err.message : ''})`,
      { cause: err },
    )
  }
  await supabase.auth.signOut()
  await forgetThisDevice()
}

/** 회원 탈퇴: 혼자 쓰던 장부·사진·계정을 지우고 이 폰도 비움 */
export async function deleteAccount() {
  const paths = await rpc('sailp_delete_account_prepare')
  if (paths?.length) {
    try {
      // 저장소 삭제는 한 번에 너무 많이 보내지 않도록 나눔
      for (let i = 0; i < paths.length; i += 100) {
        await supabase.storage.from('photos').remove(paths.slice(i, i + 100))
      }
    } catch (err) {
      console.warn('[account delete photos]', err)
    }
  }
  await rpc('sailp_delete_account')
  await supabase.auth.signOut({ scope: 'local' })
  await forgetThisDevice()
}
