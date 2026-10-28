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
