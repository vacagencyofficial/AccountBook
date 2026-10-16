import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

export function useLiveQuery(queryFn, deps = []) {
  const [data, setData] = useState(undefined)
  const [error, setError] = useState(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    setData(undefined)
    setError(null)
    setHasLoaded(false)

    const observable = liveQuery(queryFn)
    const subscription = observable.subscribe({
      next: (result) => {
        setData(result)
        setHasLoaded(true)
      },
      error: (err) => {
        setError(err)
        setHasLoaded(true)
      },
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, isLoading: !hasLoaded && !error }
}
