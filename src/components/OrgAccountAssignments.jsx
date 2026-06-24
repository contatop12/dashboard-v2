import { useCallback, useEffect, useState } from 'react'

const PROVIDERS = [
  { id: 'meta_ads', label: 'Meta Ads' },
  { id: 'google_ads', label: 'Google Ads' },
  { id: 'google_business', label: 'Google Meu Negócio' },
]

function toggleId(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

/**
 * Super admin: atribui contas descobertas (secrets) a uma organização sem OAuth.
 */
export default function OrgAccountAssignments({ orgId }) {
  const [catalog, setCatalog] = useState({ meta_ads: [], google_ads: [], google_business: [] })
  const [selected, setSelected] = useState({ meta_ads: [], google_ads: [], google_business: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setErr('')
    setSaved(false)
    try {
      const [catR, connR] = await Promise.all([
        fetch('/api/admin/accounts', { credentials: 'include' }),
        fetch(`/api/admin/orgs/${orgId}/connections`, { credentials: 'include' }),
      ])
      const cat = await catR.json().catch(() => ({}))
      const conn = await connR.json().catch(() => ({}))
      if (!catR.ok) throw new Error('Não foi possível carregar catálogo de contas')
      if (!connR.ok) throw new Error('Não foi possível carregar contas do cliente')

      setCatalog({
        meta_ads: Array.isArray(cat.meta_ads) ? cat.meta_ads : [],
        google_ads: Array.isArray(cat.google_ads) ? cat.google_ads : [],
        google_business: Array.isArray(cat.google_business) ? cat.google_business : [],
      })

      const connections = Array.isArray(conn.connections) ? conn.connections : []
      const envAssigned = connections.filter((c) => !c.oauth_credential_id)
      setSelected({
        meta_ads: envAssigned.filter((c) => c.provider === 'meta_ads').map((c) => c.external_id),
        google_ads: envAssigned.filter((c) => c.provider === 'google_ads').map((c) => c.external_id),
        google_business: envAssigned
          .filter((c) => c.provider === 'google_business')
          .map((c) => c.external_id),
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave(e) {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)
    setErr('')
    setSaved(false)
    try {
      const body = {}
      for (const p of PROVIDERS) {
        body[p.id] = selected[p.id].map((external_id) => {
          const row = catalog[p.id].find((a) => a.external_id === external_id)
          return {
            external_id,
            external_name: row?.external_name ?? row?.external_id ?? external_id,
          }
        })
      }
      const r = await fetch(`/api/admin/orgs/${orgId}/connections`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Falha ao salvar contas')
      setSaved(true)
      window.dispatchEvent(new Event('p12-account-selection-changed'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (!orgId) return null

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-surface-border bg-surface-input/30 p-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground font-sans">
          Contas atribuídas (secrets)
        </p>
        <p className="text-[10px] text-muted-foreground font-sans mt-1 leading-relaxed">
          Selecione quais contas Meta, Google Ads e Google Meu Negócio este cliente vê na dashboard. Usa os
          tokens do Worker — sem OAuth. Execute &quot;Descobrir contas&quot; em Configurações se a lista
          estiver vazia.
        </p>
      </div>

      {loading ? (
        <p className="text-[10px] text-muted-foreground font-sans">Carregando contas…</p>
      ) : (
        <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1">
          {PROVIDERS.map(({ id, label }) => (
            <div key={id} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium text-white/90 font-sans">{label}</span>
              {catalog[id].length === 0 ? (
                <p className="text-[10px] text-muted-foreground font-sans">Nenhuma conta no catálogo.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {catalog[id].map((acc) => {
                    const extId = acc.external_id
                    const checked = selected[id].includes(extId)
                    return (
                      <li key={extId}>
                        <label className="flex items-start gap-2 cursor-pointer text-[11px] text-muted-foreground font-sans hover:text-white/90">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelected((s) => ({ ...s, [id]: toggleId(s[id], extId) }))
                            }
                            className="mt-0.5 accent-brand"
                          />
                          <span>
                            {acc.external_name || extId}{' '}
                            <span className="opacity-60 font-mono text-[10px]">({extId})</span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {err ? <p className="text-[10px] text-red-400 font-sans">{err}</p> : null}
      {saved ? (
        <p className="text-[10px] text-green-400/90 font-sans">Contas atualizadas.</p>
      ) : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || loading}
        className="text-xs font-semibold py-2 rounded-md border border-brand/40 bg-brand/10 text-brand hover:bg-brand/20 disabled:opacity-50 font-sans"
      >
        {saving ? 'Salvando contas…' : 'Salvar contas atribuídas'}
      </button>
    </div>
  )
}
