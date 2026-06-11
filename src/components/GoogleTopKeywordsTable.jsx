import { useEffect, useMemo, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { MiniPagination } from '@/components/ui/MiniPagination'

const PAGE_SIZE = 5

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

/** Top 20 palavras-chave por investimento — tabela paginada (5 por página). */
export function GoogleTopKeywordsTable() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.topKeywords
  const items = useMemo(() => (Array.isArray(payload?.items) ? payload.items : []), [payload])
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [items])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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
            <tr className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-2 text-left font-semibold">Palavra-chave</th>
              <th className="px-2 py-2 text-right font-semibold">Investimento</th>
              <th className="px-2 py-2 text-right font-semibold">Impressões</th>
              <th className="px-2 py-2 text-right font-semibold">Cliques</th>
              <th className="px-2 py-2 text-right font-semibold">CPC</th>
              <th className="px-2 py-2 text-right font-semibold">Conversões</th>
              <th className="px-2 py-2 text-right font-semibold">Custo/Conv.</th>
              <th className="px-2 py-2 text-right font-semibold">1º lugar</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((kw, i) => {
              const rank = (safePage - 1) * PAGE_SIZE + i + 1
              const cpc = kw.clicks > 0 ? kw.spend / kw.clicks : null
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
