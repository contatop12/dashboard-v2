import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'p12_active_org_id'

const OrgWorkspaceContext = createContext(null)

export function OrgWorkspaceProvider({ children }) {
  const { user } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [activeOrgId, setActiveOrgIdState] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadOrgsFromApi = useCallback(async () => {
    if (!user) {
      setOrgs([])
      setActiveOrgIdState(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const r = await fetch('/api/orgs', { credentials: 'include' })
      if (!r.ok) throw new Error('orgs')
      const data = await r.json()
      const list = data.organizations ?? []
      setOrgs(list)

      let next = null
      if (user.role === 'client') {
        next = list[0]?.id ?? null
      } else {
        const stored =
          typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        if (stored === '__worker__' || stored === '' || stored === null) {
          next = null
        } else if (stored && list.some((o) => o.id === stored)) {
          next = stored
        } else {
          next = null
        }
      }
      setActiveOrgIdState(next)
    } catch {
      setOrgs([])
      setActiveOrgIdState(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user) {
        if (!cancelled) {
          setOrgs([])
          setActiveOrgIdState(null)
          setLoading(false)
        }
        return
      }
      if (!cancelled) setLoading(true)
      try {
        const r = await fetch('/api/orgs', { credentials: 'include' })
        if (!r.ok) throw new Error('orgs')
        const data = await r.json()
        const list = data.organizations ?? []
        if (cancelled) return
        setOrgs(list)

        let next = null
        if (user.role === 'client') {
          next = list[0]?.id ?? null
        } else {
          const stored =
            typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
          if (stored === '__worker__' || stored === '' || stored === null) {
            next = null
          } else if (stored && list.some((o) => o.id === stored)) {
            next = stored
          } else {
            next = null
          }
        }
        setActiveOrgIdState(next)
      } catch {
        if (!cancelled) {
          setOrgs([])
          setActiveOrgIdState(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  /** Recarrega organizações (ex.: após POST /api/orgs). */
  const refreshOrgs = useCallback(() => loadOrgsFromApi(), [loadOrgsFromApi])

  const setActiveOrgId = useCallback((id) => {
    const resolved = id && id !== '__worker__' ? id : null
    setActiveOrgIdState(resolved)
    if (typeof localStorage === 'undefined') return
    if (resolved === null) {
      localStorage.setItem(STORAGE_KEY, '__worker__')
    } else {
      localStorage.setItem(STORAGE_KEY, resolved)
    }
  }, [])

  /** Sufixo `?org_id=…` para APIs de plataforma; vazio = modo Worker (só super_admin com secrets). */
  const platformApiSuffix = useMemo(() => {
    if (!activeOrgId) return ''
    return `?org_id=${encodeURIComponent(activeOrgId)}`
  }, [activeOrgId])

  const value = useMemo(
    () => ({
      orgs,
      activeOrgId,
      setActiveOrgId,
      loading,
      platformApiSuffix,
      refreshOrgs,
    }),
    [orgs, activeOrgId, loading, setActiveOrgId, platformApiSuffix, refreshOrgs]
  )

  return <OrgWorkspaceContext.Provider value={value}>{children}</OrgWorkspaceContext.Provider>
}

export function useOrgWorkspace() {
  const ctx = useContext(OrgWorkspaceContext)
  if (!ctx) throw new Error('useOrgWorkspace deve ficar dentro de OrgWorkspaceProvider')
  return ctx
}
