import { createContext, useContext, useEffect, useState } from 'react'
import { seedIfEmpty } from '../db/seed'

const DbContext = createContext({ ready: false, error: null })

export function DbProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    seedIfEmpty()
      .then(() => setReady(true))
      .catch((err) => setError(err))
  }, [])

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center px-6 text-center">
        <div>
          <p className="text-base font-medium text-red-600">데이터베이스 초기화 실패</p>
          <p className="mt-1 text-sm text-slate-500">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm text-slate-500">불러오는 중…</p>
        </div>
      </div>
    )
  }

  return <DbContext.Provider value={{ ready, error }}>{children}</DbContext.Provider>
}

export function useDbReady() {
  return useContext(DbContext).ready
}
