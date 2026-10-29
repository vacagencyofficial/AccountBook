export const ONBOARDED_KEY = 'sailp-onboarded'

/** 처음 쓰는 분 안내를 아직 안 봤는지 */
export function needsOnboarding() {
  try {
    return !localStorage.getItem(ONBOARDED_KEY)
  } catch {
    return false
  }
}
