import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Settings2 } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { usePagedRows, TablePagination } from '@/components/ui/TablePagination'

const PAGE_SIZE = 10
/** Altura mínima do corpo da tabela. */
const PAIRED_BODY_MIN_H = 'min-h-[15rem]'
/** Termos ocultados pelo usuário (persistido entre sessões). */
const HIDDEN_TERMS_LS = 'p12_google_search_terms_hidden'

function fmtConversions(n) {
  const x = Number(n) || 0
  return Math.abs(x % 1) < 0.001
    ? formatNumber(Math.round(x))
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(x)
}

function readHiddenTerms() {
  try {
    const raw = localStorage.getItem(HIDDEN_TERMS_LS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : []
  } catch {
    return []
  }
}

function persistHiddenTerms(set) {
  try {
    if (set.size === 0) localStorage.removeItem(HIDDEN_TERMS_LS)
    else localStorage.setItem(HIDDEN_TERMS_LS, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

/** Painel da engrenagem: marcar/desmarcar quais termos aparecem na tabela. */
function SearchTermsConfig({ items, hidden, onToggle, onShowAll }) {
  const [open, setOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const configList = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return items
    return items.filter((t) => String(t.term).toLowerCase().includes(q))
  }, [items, filterText])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.04] text-muted-foreground hover:text-foreground',
          open && 'text-foreground ring-1 ring-brand/30'
        )}
        title="Configurar termos visíveis"
        aria-label="Configurar termos visíveis"
        aria-expanded={open}
      >
        <Settings2 size={13} />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-md border border-white/[0.1] bg-[#141414] p-2 shadow-xl">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ocultar termos
            </p>
            <button
              type="button"
              onClick={onShowAll}
              disabled={hidden.size === 0}
              className="text-[10px] text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:no-underline"
            >
              Mostrar todos
            </button>
          </div>
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrar termos…"
            className="mb-2 w-full rounded-md border border-white/[0.1] bg-[#0f0f0f] px-2 py-1 text-[11px] text-white outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-brand/40"
          />
          <div className="max-h-56 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {configList.length === 0 ? (
              <p className="px-1 py-2 text-[10px] text-muted-foreground">Nenhum termo encontrado.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {configList.map((t) => {
                  const isVisible = !hidden.has(t.term)
                  return (
                    <li key={t.term}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[11px] text-foreground hover:bg-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => onToggle(t.term)}
                          className="h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-transparent"
                        />
                        <span className="min-w-0 flex-1 truncate" title={t.term}>
                          {t.term}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Termos de pesquisa reais que dispararam anúncios (search_term_view). */
export function GoogleSearchTermsBlock() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.searchTerms
  const items = useMemo(() => (Array.isArray(payload?.items) ? payload.items : []), [payload])

  const [hidden, setHidden] = useState(() => new Set(readHiddenTerms()))

  const toggleHidden = (term) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(term)) next.delete(term)
      else next.add(term)
      persistHiddenTerms(next)
      return next
    })
  }

  const showAllTerms = () => {
    setHidden(() => {
      const next = new Set()
      persistHiddenTerms(next)
      return next
    })
  }

  const visibleItems = useMemo(() => items.filter((t) => !hidden.has(t.term)), [items, hidden])

  const { page, setPage, pageSize, setPageSize, totalPages, pageRows: pageItems, total, rangeStart, rangeEnd } =
    usePagedRows(visibleItems, { storageKey: 'p12_pagesize_search_terms', defaultSize: PAGE_SIZE })

  const state = loading
    ? 'loading'
    : payload?.error
      ? 'error'
      : items.length === 0
        ? 'empty'
        : 'ready'

  const titleNode = (
    <div className="flex items-center gap-1.5">
      <Search size={13} className="text-brand shrink-0" />
      <span className="section-title">Termos de pesquisa</span>
    </div>
  )

  const badge =
    items.length > 0
      ? hidden.size > 0
        ? `${visibleItems.length} de ${items.length} termos`
        : `${items.length} termos`
      : undefined

  const configControl =
    items.length > 0 ? (
      <SearchTermsConfig
        items={items}
        hidden={hidden}
        onToggle={toggleHidden}
        onShowAll={showAllTerms}
      />
    ) : null

  return (
    <BlockCard
      title={titleNode}
      badge={badge}
      actions={configControl}
      state={state}
      emptyMessage="Sem termos de pesquisa com impressões no período."
      errorMessage={String(payload?.error || '')}
      className="h-full"
      bodyClassName="flex min-h-0 flex-1 flex-col gap-2 px-3 sm:px-4 pb-3 sm:pb-4"
    >
      <p className="shrink-0 text-[9px] leading-snug text-muted-foreground/85 font-sans">
        O que as pessoas realmente digitaram no Google antes de clicar no anúncio.
      </p>
      <div className={cn('overflow-x-auto', PAIRED_BODY_MIN_H)}>
        <table className="w-full min-w-[420px] border-collapse text-xs">
          <thead>
            <tr className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-2 text-left font-semibold">Termo</th>
              <th className="px-2 py-2 text-right font-semibold">Invest.</th>
              <th className="px-2 py-2 text-right font-semibold">Impr.</th>
              <th className="px-2 py-2 text-right font-semibold">Cliques</th>
              <th className="px-2 py-2 text-right font-semibold">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-8 text-center text-[11px] text-muted-foreground font-sans">
                  Todos os termos estão ocultos. Use a engrenagem para reexibir.
                </td>
              </tr>
            ) : (
              pageItems.map((t, i) => {
                const rank = rangeStart + i
                return (
                  <tr key={t.term} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                    <td className="max-w-[240px] px-2 py-2 align-top">
                      <div className="flex items-baseline gap-1.5">
                        <span className="shrink-0 font-mono text-[9px] tabular-nums text-muted-foreground/70">
                          {rank}.
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate font-sans text-[11px] text-foreground" title={t.term}>
                            {t.term}
                          </span>
                          {t.campaignName ? (
                            <p className="truncate text-[9px] text-muted-foreground" title={t.campaignName}>
                              {t.campaignName}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-foreground">
                      {formatCurrency(t.spend)}
                    </td>
                    <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-muted-foreground">
                      {formatNumber(t.impressions)}
                    </td>
                    <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-muted-foreground">
                      {formatNumber(t.clicks)}
                    </td>
                    <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-foreground">
                      {fmtConversions(t.conversions)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        pageSize={pageSize}
        onPageSize={setPageSize}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        className="mt-auto border-t border-surface-border/80 pt-1"
      />
    </BlockCard>
  )
}
