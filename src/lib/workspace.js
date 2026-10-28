const CODE_KEY = 'sailp-workspace-code'
const ID_KEY = 'sailp-workspace-id'

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = 'SAILP-'
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

/** SAILP-XXXXXX / sailp-xxxx / 경로용 코드 정규화 */
export function normalizeWorkspaceCode(raw) {
  if (!raw) return ''
  let value = String(raw).trim().toUpperCase()
  value = value.replace(/^.*\b(SAILP-[A-Z0-9]{6})\b.*$/, '$1')
  if (/^SAILP-[A-Z0-9]{6}$/.test(value)) return value
  if (/^[A-Z0-9]{6}$/.test(value)) return `SAILP-${value}`
  return value
}

export function getWorkspaceCode() {
  try {
    return localStorage.getItem(CODE_KEY) || ''
  } catch {
    return ''
  }
}

export function getWorkspaceId() {
  try {
    return localStorage.getItem(ID_KEY) || ''
  } catch {
    return ''
  }
}

export function setWorkspaceLocal({ code, id }) {
  localStorage.setItem(CODE_KEY, code)
  localStorage.setItem(ID_KEY, id)
}

export function clearWorkspaceLocal() {
  localStorage.removeItem(CODE_KEY)
  localStorage.removeItem(ID_KEY)
}

export function createLocalWorkspaceCode() {
  return randomCode()
}

/** 다른 기기가 열면 자동 연결되는 초대 링크 */
export function buildInviteUrl(code, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  const normalized = normalizeWorkspaceCode(code)
  if (!normalized || !origin) return ''
  return `${origin.replace(/\/$/, '')}/join/${encodeURIComponent(normalized)}`
}

export function qrImageUrl(data, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}
