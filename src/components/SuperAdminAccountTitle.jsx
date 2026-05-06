import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

/**
 * Nome da conta / perfil (Worker) no cabeçalho do dashboard — só super_admin.
 * Lê `accountDisplay` do mesmo endpoint de overview da página.
 */
export default function SuperAdminAccountTitle({
  endpoint,
  emptyLabel = 'Conta não configurada',
  className,
}) {
  const { user } = useAuth()
  const [label, setLabel] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.role !== 'super_admin') return
    let cancelled = false
    setLoading(true)
    setLabel(null)
    fetch(endpoint, { credentials: 'include' })
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
  }, [user?.role, endpoint])

  if (user?.role !== 'super_admin') return null

  const shown = loading ? 'Carregando…' : label || emptyLabel

  return (
    <div
      className={cn(
        'min-w-0 max-w-[min(100%,32rem)] flex-1 text-right',
        className ?? 'ml-auto'
      )}
    >
      <p className="truncate font-sans text-base font-semibold leading-tight text-white sm:text-lg">{shown}</p>
    </div>
  )
}
