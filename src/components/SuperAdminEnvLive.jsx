import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'

/**
 * Métricas reais (OAuth da organização ou secrets do Worker no modo super admin).
 */
export default function SuperAdminEnvLive({ endpoint, title }) {
  const { user } = useAuth()
  const { platformApiSuffix, activeOrgId, loading: orgLoading } = useOrgWorkspace()
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState(null)
  const [httpError, setHttpError] = useState(null)

  const url = `${endpoint}${platformApiSuffix}`

  const defaultTitle = 'Dados ao vivo (API)'

  useEffect(() => {
    if (!user || orgLoading) return
    if (user.role === 'client' && !activeOrgId) return

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setHttpError(null)
      try {
        const r = await fetch(url, { credentials: 'include' })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) {
          if (!cancelled) {
            setPayload(null)
            setHttpError(j.error || `Erro HTTP ${r.status}`)
          }
          return
        }
        if (!cancelled) setPayload(j)
      } catch (e) {
        if (!cancelled) {
          setPayload(null)
          setHttpError(e instanceof Error ? e.message : 'Falha na requisição')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, orgLoading, activeOrgId, user?.role, url])

  useEffect(() => {
    const onSel = () => {
      if (!user || orgLoading) return
      if (user.role === 'client' && !activeOrgId) return
      fetch(url, { credentials: 'include' })
        .then((r) => r.json().catch(() => ({})))
        .then((j) => setPayload(j))
        .catch(() => {})
    }
    window.addEventListener('p12-account-selection-changed', onSel)
    return () => window.removeEventListener('p12-account-selection-changed', onSel)
  }, [user, orgLoading, activeOrgId, url])

  if (!user || orgLoading) return null
  if (user.role === 'client' && !activeOrgId) return null

  const metrics = Array.isArray(payload?.metrics) ? payload.metrics : []
  const configured = payload?.configured === true
  const apiError = payload?.error || null
  const src = payload?.source
  const resolvedTitle =
    title ||
    (src === 'oauth_org' ? 'Conta conectada · métricas reais' : defaultTitle)

  return (
    <div className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 gap-y-1">
        <ShieldCheck size={16} className="shrink-0 text-amber-400" />
        <span className="text-xs font-semibold font-sans text-amber-200/95">{resolvedTitle}</span>
        {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
      </div>
      {httpError && (
        <p className="mt-2 flex items-start gap-2 text-[11px] text-red-400 font-sans">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{httpError}</span>
        </p>
      )}
      {!loading && !httpError && !configured && payload?.detail && (
        <p className="mt-2 text-[11px] text-muted-foreground font-sans leading-relaxed">{payload.detail}</p>
      )}
      {!loading && !httpError && apiError && (
        <p className="mt-2 text-[11px] text-amber-200/80 font-sans">{apiError}</p>
      )}
      {metrics.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={`${m.label}-${m.value}`} className="min-w-0">
              <dt className="truncate text-[10px] uppercase tracking-wide text-muted-foreground font-sans">{m.label}</dt>
              <dd className="truncate font-mono text-sm text-white tabular-nums">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {!loading && !httpError && configured && metrics.length === 0 && !apiError && (
        <p className="mt-2 text-[11px] text-muted-foreground font-sans">Nenhuma métrica retornada.</p>
      )}
    </div>
  )
}
