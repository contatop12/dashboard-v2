import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

async function fetchAccessLoginUrl() {
  try {
    const r = await fetch('/api/auth/access-login-url', { credentials: 'include' })
    if (!r.ok) return null
    const data = await r.json()
    return typeof data.url === 'string' ? data.url : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessError, setAccessError] = useState('')

  const redirectToAccessLogin = useCallback(async () => {
    const loginUrl = await fetchAccessLoginUrl()
    if (loginUrl) {
      window.location.href = loginUrl
      return true
    }
    return false
  }, [])

  const refresh = useCallback(async () => {
    setAccessError('')
    const r = await fetch('/api/auth/me', { credentials: 'include' })
    let data = {}
    try {
      data = await r.json()
    } catch {
      /* ignore */
    }

    if (r.ok && data.user) {
      setUser(data.user)
      return
    }

    setUser(null)
    const err = data.error || 'Acesso negado'

    if (r.status === 403 && err.includes('Cloudflare Access')) {
      await redirectToAccessLogin()
      return
    }

    setAccessError(err)
  }, [redirectToAccessLogin])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      const data = await r.json().catch(() => ({}))
      setUser(null)
      if (data.logoutUrl) {
        window.location.href = data.logoutUrl
        return
      }
      await redirectToAccessLogin()
    } catch {
      setUser(null)
      await redirectToAccessLogin()
    }
  }, [redirectToAccessLogin])

  const value = useMemo(
    () => ({ user, loading, accessError, logout, refresh }),
    [user, loading, accessError, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
