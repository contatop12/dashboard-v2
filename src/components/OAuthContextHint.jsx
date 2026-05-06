import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'

/** Explica modo Worker vs OAuth quando o utilizador não vê seletor de contas. */
export default function OAuthContextHint() {
  const { user } = useAuth()
  const { activeOrgId, orgs, loading } = useOrgWorkspace()

  if (user?.role !== 'super_admin' || activeOrgId || loading) return null

  if (orgs.length === 0) {
    return (
      <div className="mb-3 rounded-lg border border-amber-500/35 bg-amber-500/5 px-4 py-2.5 text-[11px] leading-relaxed text-amber-100/95 font-sans">
        <strong className="text-amber-200">Sem organizações no D1</strong> — os secrets do Worker já podem alimentar
        dados em modo &quot;Ambiente Worker&quot;, mas <strong>Integrações</strong> (OAuth por cliente) precisa de uma
        organização. Cria uma em <strong>Configurações → Integrações</strong> ou{' '}
        <strong>Clientes → Criar cliente</strong>, depois escolhe a org na barra e liga Meta/Google.
      </div>
    )
  }

  return (
    <div className="mb-3 rounded-lg border border-sky-500/35 bg-sky-500/5 px-4 py-2.5 text-[11px] leading-relaxed text-sky-100/95 font-sans">
      <strong className="text-sky-200">Modo Worker</strong> — estás a usar só os{' '}
      <strong>secrets</strong> da Cloudflare (META_ACCESS_TOKEN, etc.). Isto é independente das ligações OAuth;
      na barra, escolhe uma <strong>organização</strong> para usar tokens guardados em{' '}
      <strong>Integrações</strong> por cliente.
    </div>
  )
}
