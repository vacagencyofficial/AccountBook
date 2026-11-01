import { supabase, isCloudConfigured } from './supabase'

/** 간편 로그인 종류 (VITE_AUTH_PROVIDERS=kakao,google,apple 로 켜고 끔) */
const ALL_PROVIDERS = [
  { id: 'kakao', label: '카카오로 시작하기' },
  { id: 'google', label: 'Google로 시작하기' },
  { id: 'apple', label: 'Apple로 시작하기' },
]

export function getAuthProviders() {
  const raw = import.meta.env.VITE_AUTH_PROVIDERS
  if (!raw) return ALL_PROVIDERS
  const enabled = raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  return ALL_PROVIDERS.filter((p) => enabled.includes(p.id))
}

export const isAuthAvailable = isCloudConfigured

/** 로그인 후 돌아올 주소 */
export function getAuthRedirectUrl(origin = typeof window !== 'undefined' ? window.location.origin : '') {
  return `${origin.replace(/\/$/, '')}/auth/callback`
}

export async function signInWithProvider(provider) {
  if (!supabase) throw new Error('클라우드가 설정되지 않아 로그인할 수 없어요')
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: getAuthRedirectUrl() },
  })
  if (error) throw new Error('로그인 화면을 열지 못했어요. 잠시 뒤 다시 눌러 주세요.')
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** 로그인 상태가 바뀔 때마다 알림. 해제 함수를 돌려줌 */
export function onAuthChange(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session ?? null))
  return () => data.subscription.unsubscribe()
}

const PROVIDER_NAMES = { kakao: '카카오', google: 'Google', apple: 'Apple' }

/** 화면에 보여 줄 계정 정보 */
export function describeUser(user) {
  if (!user) return null
  const meta = user.user_metadata ?? {}
  const provider = user.app_metadata?.provider ?? ''
  return {
    name: meta.full_name || meta.name || meta.nickname || meta.preferred_username || '',
    email: user.email || meta.email || '',
    provider,
    providerName: PROVIDER_NAMES[provider] ?? provider,
  }
}
