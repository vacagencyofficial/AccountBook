import { createContext, useContext, useEffect, useState } from 'react'
import { seedIfEmpty } from '../db/seed'
import { isCloudConfigured } from '../lib/supabase'
import { getWorkspaceCode } from '../lib/workspace'
import { markSyncFailed } from '../lib/syncStatus'

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
            markSyncFailed()
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
          <p className="text-[19px] font-bold text-red-700">앱을 여는 중 문제가 생겼어요</p>
          <p className="mt-2 text-[17px] font-medium text-ink-muted">앱을 닫았다가 다시 열어 주세요.</p>
          <p className="mt-3 text-[16px] text-ink-soft">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-[18px] font-semibold text-ink-muted">불러오는 중…</p>
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
