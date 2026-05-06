import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'

/**
 * Troca a conta OAuth usada para métricas (por organização), persistido em D1.
 */
export default function ChannelAccountPicker({ provider, className }) {
  const { activeOrgId } = useOrgWorkspace()
  const [connections, setConnections] = useState([])
  const [effectiveId, setEffectiveId] = useState('')
  const [loading, setLoading] = useState(false)

  const reload = () => {
    if (!activeOrgId) {
      setConnections([])
      setEffectiveId('')
      return
    }
    setLoading(true)
    Promise.all([
      fetch(`/api/orgs/${activeOrgId}/connections`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`/api/orgs/${activeOrgId}/account-selection`, { credentials: 'include' }).then((r) =>
        r.json()
      ),
    ])
      .then(([c, s]) => {
        const rows = (c.connections ?? []).filter((x) => x.provider === provider)
        setConnections(rows)
        const eff = s.effective?.[provider] ?? rows[0]?.external_id ?? ''
        setEffectiveId(eff || '')
      })
      .catch(() => {
        setConnections([])
        setEffectiveId('')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [activeOrgId, provider])

  useEffect(() => {
    const onSel = () => reload()
    window.addEventListener('p12-account-selection-changed', onSel)
    return () => window.removeEventListener('p12-account-selection-changed', onSel)
  }, [activeOrgId, provider])

  if (!activeOrgId) {
    return null
  }

  if (loading && connections.length === 0) {
    return (
      <span className={cn('text-[10px] text-muted-foreground font-sans', className)}>Contas…</span>
    )
  }

  if (connections.length === 0) {
    return (
      <span className={cn('text-[10px] text-amber-200/70 font-sans', className)}>
        Conecte em Configurações
      </span>
    )
  }

  if (connections.length === 1) {
    const one = connections[0]
    const label = one.external_name?.trim() || one.external_id
    return (
      <span
        className={cn(
          'max-w-[200px] truncate rounded-md border border-surface-border bg-surface-input px-2 py-1 text-[10px] text-muted-foreground font-sans',
          className
        )}
        title={label}
      >
        {label}
      </span>
    )
  }

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <select
        value={effectiveId}
        onChange={async (e) => {
          const external_id = e.target.value
          if (!external_id || !activeOrgId) return
          await fetch(`/api/orgs/${activeOrgId}/account-selection`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, external_id }),
          })
          setEffectiveId(external_id)
          window.dispatchEvent(new Event('p12-account-selection-changed'))
        }}
        className="channel-account-select appearance-none max-w-[220px] cursor-pointer rounded-md border border-surface-border bg-surface-input py-1 pl-2 pr-7 text-[10px] text-white font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {connections.map((c) => (
          <option key={c.id} value={c.external_id}>
            {c.external_name?.trim() || c.external_id}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}
