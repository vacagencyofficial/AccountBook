import { useEffect } from 'react'
import { applyRecurringRules } from '../lib/recurring'
import { useToast } from './toastContext'

// 앱을 켤 때 한 번만 (StrictMode에서 두 번 불려도 중복으로 적지 않게)
let started = false

/** 매달 나가는 돈·들어오는 돈: 정한 날이 지났으면 그달 기록을 적고 알려 줌 */
export default function RecurringRunner() {
  const toast = useToast()
  useEffect(() => {
    if (started) return
    started = true
    applyRecurringRules()
      .then((count) => count > 0 && toast(`매달 적는 돈 ${count}건을 장부에 적었어요`))
      .catch((err) => console.warn('[recurring]', err))
  }, [toast])
  return null
}
