import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { cn } from '@/lib/utils'

/**
 * Nome da conta / perfil nas APIs de plataforma.
 * Com `org_id` usa OAuth da organização; sem org (super_admin) usa secrets do Worker.
 */
export default function SuperAdminAccountTitle({
  endpoint,
  emptyLabel = 'Conta não configurada',
  className,
}) {
  const { user } = useAuth()
  const { platformApiSuffix } = useOrgWorkspace()
  const [label, setLabel] = useState(null)
  const [loading, setLoading] = useState(false)

  const url = `${endpoint}${platformApiSuffix}`

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

  return (
    <div
      className={cn(
        'min-w-0 max-w-[min(100%,32rem)] flex-1 text-right',
        className ?? 'ml-auto'
      )}
    >
      <p className="truncate font-sans text-base font-semibold leading-tight text-white sm:text-lg">
        {shown}
      </p>
    </div>
  )
}
