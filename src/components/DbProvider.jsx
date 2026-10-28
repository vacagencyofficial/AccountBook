import { createContext, useContext, useEffect, useState } from 'react'
import { seedIfEmpty } from '../db/seed'
import { isCloudConfigured } from '../lib/supabase'
import { getWorkspaceCode } from '../lib/workspace'

const DbContext = createContext({ ready: false, error: null, cloud: { configured: false } })

export function DbProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [cloud, setCloud] = useState({ configured: isCloudConfigured })

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        // 예시 장부는 개발/체험용 배포에서만 (실사용 장부에 가짜 기록이 생기지 않게)
        if (import.meta.env.DEV || import.meta.env.VITE_DEMO_SEED === 'true') {
          await seedIfEmpty()
        }

        if (isCloudConfigured && getWorkspaceCode()) {
          try {
            const { syncBidirectional } = await import('../db/cloudSync')
            await syncBidirectional()
          } catch (syncErr) {
            console.warn('[cloud boot sync]', syncErr)
          }
        }

        if (!cancelled) {
          setCloud({
            configured: isCloudConfigured,
            code: getWorkspaceCode(),
          })
          setReady(true)
        }
      } catch (err) {
        if (!cancelled) setError(err)
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center px-6 text-center">
        <div>
          <p className="text-[17px] font-bold text-red-600">데이터베이스 초기화 실패</p>
          <p className="mt-1 text-[14px] text-ink-muted">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-[16px] font-medium text-ink-muted">불러오는 중…</p>
      </div>
    )
  }

  return <DbContext.Provider value={{ ready, error, cloud }}>{children}</DbContext.Provider>
}

export function useDbReady() {
  return useContext(DbContext).ready
}

export function useCloudInfo() {
  return useContext(DbContext).cloud
}
