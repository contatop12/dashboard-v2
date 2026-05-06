import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plug, RefreshCw } from 'lucide-react'

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
  const [orgs, setOrgs] = useState([])
  const [orgId, setOrgId] = useState('')
  const [connections, setConnections] = useState([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [loadingConn, setLoadingConn] = useState(false)
  const [error, setError] = useState('')

  const loadOrgs = useCallback(async () => {
    setLoadingOrgs(true)
    setError('')
    try {
      const r = await fetch('/api/orgs', { credentials: 'include' })
      if (!r.ok) throw new Error('Não foi possível carregar organizações')
      const data = await r.json()
      const list = data.organizations ?? []
      setOrgs(list)
      setOrgId((prev) => prev || (list[0]?.id ?? ''))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoadingOrgs(false)
    }
  }, [])

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
    loadOrgs()
  }, [loadOrgs])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  const connectUrl = useMemo(() => {
    return (oauthPath) => {
      const q = new URLSearchParams({ org_id: orgId })
      return `/api/oauth/${oauthPath}/start?${q}`
    }
  }, [orgId])

  return (
    <div className="max-w-3xl flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-white font-display font-semibold text-sm">
            <Plug size={16} className="text-brand" />
            Conexões
          </div>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Autorize Meta e Google para esta organização. Tokens ficam cifrados no D1.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadConnections()}
          disabled={loadingConn || !orgId}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-white border border-surface-border rounded-md px-3 py-1.5 font-sans disabled:opacity-50"
        >
          <RefreshCw size={14} className={loadingConn ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-sans">
          Organização
        </label>
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          disabled={loadingOrgs || orgs.length === 0}
          className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm text-white font-sans focus:outline-none focus:border-brand/50"
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
      </div>

      {error && (
        <p className="text-xs text-red-400 font-sans bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
        <p className="text-xs text-brand font-sans">
          Configure no Meta for Developers e no Google Cloud Console as URLs de redirecionamento OAuth para{' '}
          <span className="font-mono">
            {typeof window !== 'undefined' ? window.location.origin : ''}/api/oauth/meta/callback
          </span>{' '}
          e{' '}
          <span className="font-mono">
            {typeof window !== 'undefined' ? window.location.origin : ''}/api/oauth/google/callback
          </span>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CHANNELS.map((c) => {
          const st = statusForChannel(connections, c.id)
          return (
            <div
              key={c.id}
              className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-3"
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
              <a
                href={orgId ? connectUrl(c.oauthPath) : undefined}
                aria-disabled={!orgId}
                className={`mt-auto text-center text-xs font-semibold px-3 py-2 rounded-md border transition-colors font-sans ${
                  orgId
                    ? 'border-brand/50 bg-brand/10 text-brand hover:bg-brand/20'
                    : 'border-surface-border text-muted-foreground pointer-events-none opacity-50'
                }`}
              >
                {st.ok ? 'Reconectar' : 'Conectar'}
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
