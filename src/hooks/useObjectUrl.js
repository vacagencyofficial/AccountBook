import { useEffect, useMemo, useRef } from 'react'

/**
 * 사진(Blob)을 화면에 보여 줄 주소로. 더 안 쓰면 주소를 정리해 메모리를 돌려줌.
 * 개발 모드(StrictMode)에서 화면이 잠깐 내려갔다 다시 올라와도 사진이 깨지지 않게 조금 뒤에 정리
 */
export function useObjectUrl(blob) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  const live = useRef(null)

  useEffect(() => {
    live.current = url
    return () => {
      live.current = null
      if (url) setTimeout(() => live.current !== url && URL.revokeObjectURL(url), 1000)
    }
  }, [url])

  return url
}
