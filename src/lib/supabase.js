import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isCloudConfigured = Boolean(url && anonKey)

export const supabase = isCloudConfigured
  ? createClient(url, anonKey, {
      auth: {
        // 간편 로그인: 로그인 상태를 이 기기에 기억하고, 돌아온 주소(?code=)로 자동 로그인 처리
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

export function getCloudConfigError() {
  if (!url || !anonKey) {
    return 'Supabase URL/키(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 없습니다'
  }
  return null
}
