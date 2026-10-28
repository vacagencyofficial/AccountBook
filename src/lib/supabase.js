import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isCloudConfigured = Boolean(url && anonKey)

export const supabase = isCloudConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

export function getCloudConfigError() {
  if (!url || !anonKey) {
    return 'Supabase URL/키(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 없습니다'
  }
  return null
}
