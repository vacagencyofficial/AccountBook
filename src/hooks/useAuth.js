import { useEffect, useState } from 'react'
import { getSession, onAuthChange } from '../lib/auth'

/** 지금 로그인한 계정 (loading 동안은 아직 모름) */
export function useAuth() {
  const [state, setState] = useState({ loading: true, session: null })

  useEffect(() => {
    let alive = true
    getSession().then((session) => {
      if (alive) setState({ loading: false, session })
    })
    const off = onAuthChange((session) => {
      if (alive) setState({ loading: false, session })
    })
    return () => {
      alive = false
      off()
    }
  }, [])

  return { loading: state.loading, session: state.session, user: state.session?.user ?? null }
}
