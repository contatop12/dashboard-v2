import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, KeyRound } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { MiniPagination } from '@/components/ui/MiniPagination'

const PAGE_SIZE = 5
const DEFAULT_SORT = { id: 'spend', desc: true }

const COLUMNS = [
  { id: 'keyword', label: 'Palavra-chave', align: 'left' },
  { id: 'spend', label: 'Investimento', align: 'right' },
  { id: 'impressions', label: 'Impressões', align: 'right' },
  { id: 'clicks', label: 'Cliques', align: 'right' },
  { id: 'cpc', label: 'CPC', align: 'right' },
  { id: 'conversions', label: 'Conversões', align: 'right' },
  { id: 'costPerConversion', label: 'Custo/Conv.', align: 'right' },
  { id: 'absTopPct', label: '1º lugar', align: 'right' },
]

const MATCH_TYPE_LABELS = {
  BROAD: 'Ampla',
  PHRASE: 'Frase',
  EXACT: 'Exata',
}

function fmtConversions(n) {
  const x = Number(n) || 0
  return Math.abs(x % 1) < 0.001
    ? formatNumber(Math.round(x))
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(x)
}

function fmtPct(p) {
  if (p == null || Number.isNaN(Number(p))) return '—'
  const n = Number(p)
  if (n > 0 && n < 1) return '<1%'
  return `${Math.round(n)}%`
}

function cpcOf(kw) {
  return kw.clicks > 0 ? kw.spend / kw.clicks : null
}

function sortValue(kw, sortId) {
  switch (sortId) {
    case 'keyword':
      return String(kw.keyword ?? '').toLowerCase()
    case 'spend':
      return Number(kw.spend) || 0
    case 'impressions':
      return Number(kw.impressions) || 0
    case 'clicks':
      return Number(kw.clicks) || 0
    case 'cpc':
      return cpcOf(kw)
    case 'conversions':
      return Number(kw.conversions) || 0
    case 'costPerConversion':
      return kw.costPerConversion != null ? Number(kw.costPerConversion) : null
    case 'absTopPct':
      return kw.absTopPct != null ? Number(kw.absTopPct) : null
    default:
      return 0
  }
}

function compareSortValues(a, b) {
  const na = a == null || (typeof a === 'number' && Number.isNaN(a))
  const nb = b == null || (typeof b === 'number' && Number.isNaN(b))
  if (na && nb) return 0
  if (na) return 1
  if (nb) return -1
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, 'pt-BR')
  }
  if (a === b) return 0
  return a > b ? 1 : -1
}

function sortKeywords(items, sort) {
  const list = [...items]
  list.sort((a, b) => {
    const cmp = compareSortValues(sortValue(a, sort.id), sortValue(b, sort.id))
    return sort.desc ? -cmp : cmp
  })
  return list
}

function SortHeader({ column, sort, onSort }) {
  const active = sort.id === column.id
  const direction = active ? (sort.desc ? 'desc' : 'asc') : null
  return (
    <th
      className={cn(
        'px-2 py-2 font-semibold',
        column.align === 'left' ? 'text-left' : 'text-right'
      )}
    >
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-0.5 font-semibold uppercase tracking-wider transition-colors hover:text-foreground',
          column.align === 'left' ? 'justify-start' : 'justify-end ml-auto',
          active ? 'text-brand' : 'text-muted-foreground'
        )}
        onClick={() => onSort(column.id)}
        aria-sort={direction ?? 'none'}
      >
        {column.label}
        {direction === 'asc' ? (
          <ArrowUp className="h-3 w-3 shrink-0 text-brand" aria-hidden />
        ) : direction === 'desc' ? (
          <ArrowDown className="h-3 w-3 shrink-0 text-brand" aria-hidden />
        ) : (
          <span className="inline-block h-3 w-3 shrink-0 opacity-30" aria-hidden />
        )}
      </button>
    </th>
  )
}

/** Top palavras-chave por investimento — tabela paginada com ordenação por coluna. */
export function GoogleTopKeywordsTable() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.topKeywords
  const items = useMemo(() => (Array.isArray(payload?.items) ? payload.items : []), [payload])
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState(DEFAULT_SORT)

  const sortedItems = useMemo(() => sortKeywords(items, sort), [items, sort])

  useEffect(() => {
    setPage(1)
  }, [items, sort])

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = sortedItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const onSort = (columnId) => {
    setSort((prev) =>
      prev.id === columnId ? { id: columnId, desc: !prev.desc } : { id: columnId, desc: true }
    )
  }

  const state = loading
    ? 'loading'
    : payload?.error
      ? 'error'
      : items.length === 0
        ? 'empty'
        : 'ready'

  const titleNode = (
    <div className="flex items-center gap-1.5">
      <KeyRound size={13} className="text-brand shrink-0" />
      <span className="section-title">Top {items.length >= 20 ? 20 : items.length || 20} palavras-chave por investimento</span>
    </div>
  )

  return (
    <BlockCard
      title={titleNode}
      badge={items.length > 0 ? `${items.length} palavras` : undefined}
      state={state}
      emptyMessage="Sem palavras-chave com dados no período. Contas só com Performance Max não aparecem aqui."
      errorMessage={String(payload?.error || '')}
      bodyClassName="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-2"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-xs">
          <thead>
            <tr className="text-[9px]">
              {COLUMNS.map((col) => (
                <SortHeader key={col.id} column={col} sort={sort} onSort={onSort} />
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((kw, i) => {
              const rank = (safePage - 1) * PAGE_SIZE + i + 1
              const cpc = cpcOf(kw)
              const match = MATCH_TYPE_LABELS[String(kw.matchType || '').toUpperCase()]
              return (
                <tr
                  key={`${kw.campaignId}-${kw.keyword}`}
                  className="border-t border-white/[0.05] hover:bg-white/[0.03]"
                >
                  <td className="max-w-[280px] px-2 py-2 align-top">
                    <div className="flex items-baseline gap-1.5">
                      <span className="shrink-0 font-mono text-[9px] tabular-nums text-muted-foreground/70">
                        {rank}.
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-sans text-[11px] font-medium text-foreground" title={kw.keyword}>
                            {kw.keyword}
                          </span>
                          {match ? (
                            <span className="shrink-0 rounded bg-white/[0.06] px-1 py-px text-[8px] uppercase tracking-wide text-muted-foreground">
                              {match}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-[9px] text-muted-foreground" title={kw.campaignName}>
                          {kw.campaignName}
                          {kw.adGroupName ? ` · ${kw.adGroupName}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right align-top font-mono text-[11px] font-semibold tabular-nums text-foreground">
                    {formatCurrency(kw.spend)}
                  </td>
                  <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-muted-foreground">
                    {formatNumber(kw.impressions)}
                  </td>
                  <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-muted-foreground">
                    {formatNumber(kw.clicks)}
                  </td>
                  <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-muted-foreground">
                    {cpc != null ? formatCurrency(cpc) : '—'}
                  </td>
                  <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-foreground">
                    {fmtConversions(kw.conversions)}
                  </td>
                  <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-muted-foreground">
                    {kw.costPerConversion != null ? formatCurrency(kw.costPerConversion) : '—'}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-2 text-right align-top font-mono tabular-nums',
                      kw.absTopPct != null && kw.absTopPct >= 50 ? 'text-green-400' : 'text-muted-foreground'
                    )}
                    title="% das impressões exibidas em 1º lugar absoluto"
                  >
                    {fmtPct(kw.absTopPct)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <MiniPagination
        page={safePage}
        totalPages={totalPages}
        onPage={setPage}
        className="border-t border-surface-border/80 pt-1"
      />
    </BlockCard>
  )
}
