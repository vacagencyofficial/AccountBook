import { useEffect, useState } from 'react'
import { getToday } from '../utils/format'

/** 오늘 날짜(YYYY-MM-DD). 앱을 켜 둔 채 자정을 넘기거나, 다음 날 다시 열면 바뀜 */
export function useToday() {
  const [today, setToday] = useState(getToday)

  useEffect(() => {
    const refresh = () => setToday(getToday())
    const now = new Date()
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
    const timer = window.setTimeout(refresh, nextMidnight - now)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [today])

  return today
}
