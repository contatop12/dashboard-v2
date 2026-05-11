import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { cn } from '@/lib/utils'

const STORAGE = {
  meta_ads: 'p12_worker_meta_ad_account',
  google_ads: 'p12_worker_google_ads_customer',
}

export function normalizeWorkerMetaActId(raw) {
  const t = String(raw ?? '')
    .trim()
    .replace(/\s/g, '')
  if (!t) return ''
  if (t.startsWith('act_')) return t
  return `act_${t}`
}

export function readWorkerMetaQueryFromStorage() {
  try {
    const v = localStorage.getItem(STORAGE.meta_ads)
    if (!v) return ''
    const id = normalizeWorkerMetaActId(v)
    return id ? `ad_account_id=${encodeURIComponent(id)}` : ''
  } catch {
    return ''
  }
}

export function readWorkerGoogleAdsQueryFromStorage() {
  try {
    const v = localStorage.getItem(STORAGE.google_ads)?.replace(/\D/g, '')
    return v ? `customer_id=${encodeURIComponent(v)}` : ''
  } catch {
    return ''
  }
}

/**
 * Super admin, sem organização ativa (modo secrets): lista contas da API e persiste escolha em localStorage.
 * O pai deve inicializar `workerPlatformQuery` com `readWorker*FromStorage()` e passar `setWorkerPlatformQuery` aqui.
 */
export default function WorkerSecretsAccountPicker({ provider, onWorkerQueryChange }) {
  const { user } = useAuth()
  const { activeOrgId } = useOrgWorkspace()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState('')

  const listEndpoint =
    provider === 'meta_ads'
      ? '/api/admin/platform/meta-accounts'
      : '/api/admin/platform/google-ads-accounts'
  const storageKey = STORAGE[provider]

  useEffect(() => {
    if (user?.role !== 'super_admin' || activeOrgId) return
    try {
      setSelected(localStorage.getItem(storageKey) || '')
    } catch {
      setSelected('')
    }
  }, [user?.role, activeOrgId, storageKey])

  const emitQuery = useCallback(
    (rawValue) => {
      if (!rawValue) {
        try {
          localStorage.removeItem(storageKey)
        } catch {
          /* ignore */
        }
        onWorkerQueryChange('')
        window.dispatchEvent(new Event('p12-account-selection-changed'))
        return
      }
      if (provider === 'meta_ads') {
        const id = normalizeWorkerMetaActId(rawValue)
        try {
          localStorage.setItem(storageKey, id)
        } catch {
          /* ignore */
        }
        onWorkerQueryChange(`ad_account_id=${encodeURIComponent(id)}`)
      } else {
        const digits = String(rawValue).replace(/\D/g, '')
        if (!digits) {
          try {
            localStorage.removeItem(storageKey)
          } catch {
            /* ignore */
          }
          onWorkerQueryChange('')
        } else {
          try {
            localStorage.setItem(storageKey, digits)
          } catch {
            /* ignore */
          }
          onWorkerQueryChange(`customer_id=${encodeURIComponent(digits)}`)
        }
      }
      window.dispatchEvent(new Event('p12-account-selection-changed'))
    },
    [onWorkerQueryChange, provider, storageKey]
  )

  useEffect(() => {
    if (user?.role !== 'super_admin' || activeOrgId) return
    let cancelled = false
    setLoading(true)
    setErr('')
    fetch(listEndpoint, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setAccounts(Array.isArray(d.accounts) ? d.accounts : [])
        if (d.error) setErr(String(d.error))
      })
      .catch(() => {
        if (!cancelled) {
          setAccounts([])
          setErr('Falha ao carregar contas')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.role, activeOrgId, listEndpoint])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter((a) => {
      const id = a.id ?? ''
      const name = a.name ?? ''
      return `${name} ${id}`.toLowerCase().includes(q)
    })
  }, [accounts, search])

  const savedInList =
    selected &&
    filtered.some((a) =>
      provider === 'meta_ads'
        ? normalizeWorkerMetaActId(a.id) === normalizeWorkerMetaActId(selected)
        : String(a.id).replace(/\D/g, '') === String(selected).replace(/\D/g, '')
    )

  const selectValue = (() => {
    if (!selected) return ''
    if (savedInList) {
      return provider === 'meta_ads'
        ? normalizeWorkerMetaActId(selected)
        : String(selected).replace(/\D/g, '')
    }
    return selected
  })()

  const onSelectChange = (e) => {
    const val = e.target.value
    setSelected(val)
    emitQuery(val)
  }

  if (user?.role !== 'super_admin' || activeOrgId) return null

  const label =
    provider === 'meta_ads' ? 'Conta de anúncios (secrets)' : 'Cliente Google Ads (secrets)'

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 rounded-lg border border-surface-border bg-surface-input/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground font-sans">
          {label}
        </span>
        {loading && <span className="text-[10px] text-muted-foreground font-sans">Carregando…</span>}
      </div>
      <div className="relative">
        <Search
          size={12}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar na lista…"
          className="w-full rounded-md border border-surface-border bg-[#141414] py-2 pl-8 pr-3 text-xs text-white placeholder:text-muted-foreground focus:border-brand/40 focus:outline-none font-sans"
        />
      </div>
      <div className="relative">
        <select
          value={selectValue}
          onChange={onSelectChange}
          disabled={loading}
          className={cn(
            'channel-account-select w-full appearance-none cursor-pointer rounded-md border border-surface-border bg-[#141414] py-2.5 pl-3 pr-9 text-xs text-white font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50'
          )}
          aria-label={label}
        >
          <option value="">
            {provider === 'meta_ads'
              ? 'Padrão (.env ou primeira conta)'
              : 'Padrão (.env ou selecione um cliente)'}
          </option>
          {selected && !savedInList && (
            <option
              value={
                provider === 'meta_ads'
                  ? normalizeWorkerMetaActId(selected)
                  : String(selected).replace(/\D/g, '')
              }
            >
              {provider === 'meta_ads' ? normalizeWorkerMetaActId(selected) : `Salvo: ${selected}`}
            </option>
          )}
          {filtered.map((a) => {
            const val =
              provider === 'meta_ads' ? normalizeWorkerMetaActId(a.id) : String(a.id).replace(/\D/g, '')
            return (
              <option key={val} value={val}>
                {a.name} ({val})
              </option>
            )
          })}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      </div>
      {err ? <p className="text-[10px] text-amber-200/90 font-sans">{err}</p> : null}
      {!loading && accounts.length === 0 && !err ? (
        <p className="text-[10px] text-muted-foreground font-sans">
          Nenhuma conta listada. Confira secrets (token, developer token) e permissões da API.
        </p>
      ) : null}
    </div>
  )
}
