import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { cn } from '@/lib/utils'

/**
 * Nome da conta / perfil nas APIs de plataforma.
 * Com `org_id` usa OAuth da organização; sem org (super_admin) usa secrets do Worker.
 * `workerPlatformQuery`: ex. `ad_account_id=act_123` (sem `?`; só no modo sem org).
 */
export default function SuperAdminAccountTitle({
  endpoint,
  emptyLabel = 'Conta não configurada',
  className,
  workerPlatformQuery = '',
}) {
  const { user } = useAuth()
  const { platformApiSuffix } = useOrgWorkspace()
  const [label, setLabel] = useState(null)
  const [loading, setLoading] = useState(false)

  const url = useMemo(() => {
    const base = `${endpoint}${platformApiSuffix}`
    if (platformApiSuffix) return base
    const q = typeof workerPlatformQuery === 'string' ? workerPlatformQuery.trim() : ''
    if (q) return `${endpoint}?${q}`
    return base
  }, [endpoint, platformApiSuffix, workerPlatformQuery])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setLabel(null)
    fetch(url, { credentials: 'include' })
      .then((r) => r.json().catch(() => ({})))
      .then((j) => {
        if (cancelled) return
        const v = typeof j?.accountDisplay === 'string' ? j.accountDisplay.trim() : ''
        setLabel(v || null)
      })
      .catch(() => {
        if (!cancelled) setLabel(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, url])

  useEffect(() => {
    const onSel = () => {
      fetch(url, { credentials: 'include' })
        .then((r) => r.json().catch(() => ({})))
        .then((j) => {
          const v = typeof j?.accountDisplay === 'string' ? j.accountDisplay.trim() : ''
          setLabel(v || null)
        })
        .catch(() => {})
    }
    window.addEventListener('p12-account-selection-changed', onSel)
    return () => window.removeEventListener('p12-account-selection-changed', onSel)
  }, [url])

  if (!user) return null

  const shown = loading ? 'Carregando…' : label || emptyLabel
  const alignLeft = (className || '').includes('text-left')

  return (
    <div
      className={cn(
        'min-w-0 flex-1',
        className ?? 'ml-auto max-w-[min(100%,32rem)] text-right'
      )}
    >
      <p
        className={cn(
          'truncate font-sans text-base font-semibold leading-tight text-white sm:text-lg',
          alignLeft ? 'text-left' : 'text-right'
        )}
      >
        {shown}
      </p>
    </div>
  )
}
