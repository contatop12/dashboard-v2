import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' })
    if (!r.ok) throw new Error('Falha ao verificar sessão')
    const data = await r.json()
    setUser(data.user ?? null)
  }, [])

  useEffect(() => {
    refresh()
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (email, password) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    let data = {}
    try {
      data = await r.json()
    } catch {
      /* ignore */
    }
    if (!r.ok) {
      throw new Error(data.error || 'Falha no login')
    }
    setUser(data.user ?? null)
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
