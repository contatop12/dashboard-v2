import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'

/** Explica modo Worker vs OAuth quando o utilizador não vê seletor de contas. */
export default function OAuthContextHint() {
  const { user } = useAuth()
  const { activeOrgId } = useOrgWorkspace()

  if (user?.role !== 'super_admin' || activeOrgId) return null

  return (
    <div className="mb-3 rounded-lg border border-sky-500/35 bg-sky-500/5 px-4 py-2.5 text-[11px] leading-relaxed text-sky-100/95 font-sans">
      <strong className="text-sky-200">Modo Worker</strong> — estás a usar só os{' '}
      <strong>secrets</strong> da Cloudflare (META_ACCESS_TOKEN, etc.). Isto{' '}
      <strong>não lista contas OAuth</strong>. Para escolher uma conta de cliente:{' '}
      <span className="text-white">
        1) Na barra em cima, muda de &quot;Ambiente Worker&quot; para a{' '}
        <strong>organização</strong>; 2) Em <strong>Configurações → Conexões</strong>, faz login Meta/Google
        para essa org.
      </span>
    </div>
  )
}
