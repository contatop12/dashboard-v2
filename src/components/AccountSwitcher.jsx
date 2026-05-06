import { useEffect, useState } from 'react'
import { Building2, ChevronRight } from 'lucide-react'

/**
 * Placeholder Onda 1: super admin sempre vê bloco de contexto;
 * cliente só vê se tiver ≥ 2 contas no mesmo provedor (via /connections).
 */
export default function AccountSwitcher({ user }) {
  const [showBlock, setShowBlock] = useState(user?.role === 'super_admin')
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!user) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const r = await fetch('/api/orgs', { credentials: 'include' })
        if (!r.ok) throw new Error('orgs')
        const data = await r.json()
        const list = data.organizations ?? []
        if (cancelled) return
        setOrgs(list)

        if (user.role === 'super_admin') {
          setShowBlock(true)
          return
        }

        if (list.length === 0) {
          setShowBlock(false)
          return
        }
        const orgId = list[0].id
        const cr = await fetch(`/api/orgs/${orgId}/connections`, { credentials: 'include' })
        if (!cr.ok) throw new Error('connections')
        const cd = await cr.json()
        const byProvider = {}
        for (const c of cd.connections ?? []) {
          byProvider[c.provider] = (byProvider[c.provider] || 0) + 1
        }
        const multi = Object.values(byProvider).some((n) => n >= 2)
        if (!cancelled) setShowBlock(multi)
      } catch {
        if (!cancelled) setShowBlock(user.role === 'super_admin')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [user])

  if (!showBlock && !loading) return null

  return (
    <div className="px-2 py-2 border-b border-surface-border">
      <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-sans">
        <Building2 size={12} />
        Contas / organização
      </div>
      {loading ? (
        <p className="px-2 py-2 text-xs text-muted-foreground font-sans">Carregando…</p>
      ) : user?.role === 'super_admin' ? (
        <div className="px-2 py-2 rounded-md bg-surface-hover/50 border border-surface-border/80">
          <p className="text-xs text-white font-sans font-medium">Visão administrativa</p>
          <p className="text-[11px] text-muted-foreground font-sans mt-1">
            Seletor de conta por canal chega na Onda 2 (OAuth). {orgs.length > 0 ? `${orgs.length} org(s) no sistema.` : ''}
          </p>
        </div>
      ) : (
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md text-left text-xs text-muted-foreground opacity-70 cursor-not-allowed"
        >
          <span className="font-sans truncate">Trocar conta conectada</span>
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}
