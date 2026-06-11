import { Building2 } from 'lucide-react'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'

/**
 * Seletor de organização no menu do usuário (super admin e clientes multi-org).
 */
export default function AccountSwitcher({ user }) {
  const { orgs, activeOrgId, setActiveOrgId, loading } = useOrgWorkspace()

  if (!user) return null

  const showOrgSelect =
    !loading && orgs.length > 0 && (user.role === 'super_admin' || orgs.length > 1)

  if (!showOrgSelect) return null

  const activeOrg = orgs.find((o) => o.id === activeOrgId)

  return (
    <div className="border-b border-surface-border px-2 py-2">
      <div className="mb-2 flex items-center gap-2 px-2 text-[10px] font-sans uppercase tracking-wider text-muted-foreground">
        <Building2 size={12} />
        Organização
      </div>
      <div className="px-2">
        <select
          value={activeOrgId ?? ''}
          onChange={(e) => setActiveOrgId(e.target.value || null)}
          className="h-8 w-full cursor-pointer rounded-md border border-surface-border bg-surface-input px-2 font-sans text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          title="Organização ativa"
        >
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        {activeOrg ? (
          <p className="mt-1.5 px-0.5 font-sans text-[10px] text-muted-foreground">
            Dados OAuth de <span className="text-white/90">{activeOrg.name}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}
