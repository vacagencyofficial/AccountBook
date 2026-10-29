import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * 사진 크게 보기를 열고 닫는 상태. 주소 기록(state)에 남겨서
 * 폰의 「뒤로」 버튼을 누르면 앱을 나가지 않고 크게 보기만 닫힘
 */
export function useViewerState(key = 'viewer') {
  const location = useLocation()
  const navigate = useNavigate()
  const openIndex = location.state?.[key] ?? null

  const open = useCallback(
    (index) => navigate(location.pathname + location.search, { state: { ...location.state, [key]: index } }),
    [navigate, location, key],
  )
  const close = useCallback(() => navigate(-1), [navigate])

  return [openIndex, open, close]
}
