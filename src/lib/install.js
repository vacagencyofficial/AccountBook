/**
 * 홈 화면 추가(PWA 설치) 상태를 앱 전체에서 같이 씀.
 * 크롬·삼성 인터넷이 주는 설치 신호(beforeinstallprompt)는 한 번만 오므로 앱이 켜질 때 받아 둠
 */
let deferredPrompt = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => fn())
}

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function subscribeInstall(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function canPromptInstall() {
  return deferredPrompt != null
}

/** 설치 창 띄우기. 추가했으면 true */
export async function promptInstall() {
  if (!deferredPrompt) return false
  const event = deferredPrompt
  deferredPrompt = null
  event.prompt()
  const choice = await event.userChoice
  notify()
  return choice?.outcome === 'accepted'
}

export function isInstalledApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function isIosSafari() {
  const ua = window.navigator.userAgent
  return isIos() && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
}
