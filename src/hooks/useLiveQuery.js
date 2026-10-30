import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

/**
 * Dexie 조회 결과를 화면에 연결하고, DB가 바뀌면 저절로 다시 그림.
 * deps가 바뀌면 새 결과가 올 때까지 「불러오는 중」 (지난 결과를 보여 주지 않음)
 */
export function useLiveQuery(queryFn, deps = []) {
  // deps(숫자·문자 같은 단순 값)를 하나의 열쇠로 묶어, 결과가 어느 deps 것인지 표시
  const key = JSON.stringify(deps)
  const [state, setState] = useState({ key: null, data: undefined, error: null })

  useEffect(() => {
    const subscription = liveQuery(queryFn).subscribe({
      next: (data) => setState({ key, data, error: null }),
      error: (error) => setState({ key, data: undefined, error }),
    })
    return () => subscription.unsubscribe()
    // queryFn은 deps가 같으면 같은 조회라서 key만 봄
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const current = state.key === key
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : null,
    isLoading: !current,
  }
}
