import { useCallback, useEffect, useState } from 'react'
import { Plug, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'

const CHANNELS = [
  {
    id: 'meta_ads',
    title: 'Meta Ads',
    desc: 'Campanhas e conjuntos no Facebook / Instagram Ads.',
    oauthPath: 'meta',
    note: 'Usa o mesmo app Meta (Facebook Login).',
  },
  {
    id: 'instagram',
    title: 'Instagram Business',
    desc: 'Conteúdo orgânico e insights da conta IG ligada à sua Página.',
    oauthPath: 'meta',
    note: 'Conectado junto com Meta — exige Página com IG Business vinculado.',
  },
  {
    id: 'google_ads',
    title: 'Google Ads',
    desc: 'Busca, Display, Performance Max.',
    oauthPath: 'google',
    note: 'Inclui escopo Google Ads + Perfil de Negócio num único login Google.',
  },
  {
    id: 'google_business',
    title: 'Google Meu Negócio',
    desc: 'Contas e locais no Google Business Profile.',
    oauthPath: 'google',
    note: 'Mesmo login Google que Google Ads.',
  },
]

function statusForChannel(connections, channelId) {
  const rows = connections.filter((c) => c.provider === channelId)
  if (rows.length === 0) return { label: 'Desconectado', ok: false, rows: [] }
  return {
    label: `${rows.length} conta(s)`,
    ok: true,
    rows,
  }
}

export default function Conexoes() {
  const { user, loading: authLoading } = useAuth()
  const { orgs, loading: loadingOrgs, refreshOrgs, setActiveOrgId, activeOrgId } = useOrgWorkspace()
  const [orgId, setOrgId] = useState('')
  const [connections, setConnections] = useState([])
  const [loadingConn, setLoadingConn] = useState(false)
  const [error, setError] = useState('')
  const [refreshResult, setRefreshResult] = useState(null)
  const [newOrgName, setNewOrgName] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [createError, setCreateError] = useState('')
  const [deletingOrg, setDeletingOrg] = useState(false)

  useEffect(() => {
    setOrgId((prev) => {
      if (orgs.length === 0) return ''
      if (prev && orgs.some((o) => o.id === prev)) return prev
      return orgs[0].id
    })
  }, [orgs])

  const loadConnections = useCallback(async () => {
    if (!orgId) return
    setLoadingConn(true)
    setError('')
    try {
      const r = await fetch(`/api/orgs/${orgId}/connections`, { credentials: 'include' })
      if (!r.ok) throw new Error('Não foi possível carregar conexões')
      const data = await r.json()
      setConnections(data.connections ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoadingConn(false)
    }
  }, [orgId])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  async function handleCreateOrganization(e) {
    e.preventDefault()
    const name = newOrgName.trim()
    if (!name) return
    setCreateError('')
    setCreatingOrg(true)
    try {
      const r = await fetch('/api/orgs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível criar a organização')
      setNewOrgName('')
      await refreshOrgs()
      if (data.organization?.id) setOrgId(data.organization.id)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setCreatingOrg(false)
    }
  }

  async function handleDeleteOrganization() {
    if (!orgId) return
    const org = orgs.find((o) => o.id === orgId)
    const label = org?.name || 'esta organização'
    const ok = window.confirm(
      `Excluir "${label}"?\n\nRemove a organização e contas ligadas. Se houver usuário cliente owner, também será removido.`
    )
    if (!ok) return

    setDeletingOrg(true)
    setError('')
    try {
      const r = await fetch(`/api/admin/orgs/${encodeURIComponent(orgId)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Falha ao excluir')
      if (activeOrgId === orgId) setActiveOrgId(null)
      setOrgId('')
      setConnections([])
      await refreshOrgs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir organização')
    } finally {
      setDeletingOrg(false)
    }
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-white font-display font-semibold text-sm">
            <Plug size={16} className="text-brand" />
            Integrações
          </div>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Contas Meta e Google são atribuídas pelo super admin em{' '}
            <strong className="text-white/90">Clientes → Editar</strong>, usando os secrets do Worker. Login OAuth
            está temporariamente desativado.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            void refreshOrgs()
            await loadConnections()
            if (!orgId) return
            try {
              const r = await fetch(`/api/orgs/${orgId}/accounts/refresh`, {
                method: 'POST',
                credentials: 'include',
              })
              if (r.ok) {
                const d = await r.json()
                setRefreshResult(d)
                await loadConnections()
              }
            } catch {
              // silent — refresh still useful even if deep scan fails
            }
          }}
          disabled={loadingConn || !orgId}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-white border border-surface-border rounded-md px-4 py-2 font-sans disabled:opacity-50"
        >
          <RefreshCw size={14} className={loadingConn ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-sans">
          Organização
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            disabled={loadingOrgs || orgs.length === 0}
            className="flex-1 min-w-[200px] bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm text-white font-sans focus:outline-none focus:border-brand/50"
          >
            {orgs.length === 0 ? (
              <option value="">Nenhuma organização</option>
            ) : (
              orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.slug})
                </option>
              ))
            )}
          </select>
          {user?.role === 'super_admin' && orgId ? (
            <button
              type="button"
              onClick={handleDeleteOrganization}
              disabled={deletingOrg}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50 font-sans"
              title="Excluir organização"
            >
              <Trash2 size={13} />
              {deletingOrg ? 'Excluindo…' : 'Excluir'}
            </button>
          ) : null}
        </div>
      </div>

      {!authLoading && !loadingOrgs && orgs.length === 0 && user?.role === 'super_admin' && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-4 space-y-4">
          <p className="text-xs text-amber-100/95 font-sans leading-relaxed">
            Ainda não existe nenhuma <strong className="text-amber-200">organização</strong> na base de dados.
            Cria uma aqui (ou em <strong className="text-amber-200">Clientes → Criar cliente</strong>). Depois escolhe
            essa org na barra superior e usa <strong className="text-amber-200">Conectar</strong> — os secrets do
            Worker não preenchem automaticamente esta lista.
          </p>
          <form onSubmit={handleCreateOrganization} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-sans">
                Nome da organização
              </label>
              <input
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Ex.: Ventura Vet"
                className="bg-surface-input border border-surface-border rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:border-brand/50 font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={creatingOrg || !newOrgName.trim()}
              className="shrink-0 bg-brand text-[#0F0F0F] text-xs font-semibold px-4 py-2 rounded-md hover:bg-brand/90 font-sans disabled:opacity-50"
            >
              {creatingOrg ? 'A criar…' : 'Criar organização'}
            </button>
          </form>
          {createError && <p className="text-xs text-red-400 font-sans">{createError}</p>}
        </div>
      )}

      {!authLoading && !loadingOrgs && orgs.length === 0 && user && user.role !== 'super_admin' && (
        <p className="text-xs text-muted-foreground font-sans rounded-lg border border-surface-border bg-surface-card px-4 py-3">
          Não tens organizações associadas. Pede a um administrador para te adicionar a uma organização.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400 font-sans bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3">
        <p className="text-xs text-amber-100/95 font-sans leading-relaxed">
          <strong className="text-amber-200">OAuth desativado.</strong> Para ligar contas a uma organização, vá em{' '}
          <strong className="text-amber-200">Clientes</strong>, edite o cliente e marque as contas em &quot;Contas
          atribuídas&quot;. Execute &quot;Descobrir contas&quot; em Configurações para atualizar o catálogo a partir do
          MCC / Business Manager.
        </p>
      </div>

      {refreshResult && (
        <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
          <p className="text-xs text-brand font-sans">
            Varredura concluída —{' '}
            <strong>{refreshResult.added ?? 0}</strong> nova(s) conta(s),{' '}
            <strong>{refreshResult.updated ?? 0}</strong> atualizada(s).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CHANNELS.map((c) => {
          const st = statusForChannel(connections, c.id)
          return (
            <div
              key={c.id}
              className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-4"
            >
              <div>
                <h3 className="text-sm font-semibold text-white font-display">{c.title}</h3>
                <p className="text-[11px] text-muted-foreground font-sans mt-1">{c.desc}</p>
                <p className="text-[10px] text-muted-foreground/80 font-sans mt-2">{c.note}</p>
              </div>
              <span
                className={`text-[10px] font-mono ${st.ok ? 'text-green-400/90' : 'text-muted-foreground'}`}
              >
                {st.label}
              </span>
              {st.rows.length > 0 && (
                <ul className="text-[10px] text-muted-foreground font-sans space-y-1 max-h-24 overflow-y-auto">
                  {st.rows.map((row) => (
                    <li key={row.id}>
                      {row.external_name || row.external_id}{' '}
                      <span className="opacity-60">({row.external_id})</span>
                    </li>
                  ))}
                </ul>
              )}
              <span
                className={`mt-auto text-center text-xs font-semibold px-4 py-2 rounded-md border font-sans border-surface-border text-muted-foreground opacity-60 cursor-not-allowed`}
                title="OAuth desativado — atribua contas em Clientes → Editar"
              >
                OAuth desativado
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
