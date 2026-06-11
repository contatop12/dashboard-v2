import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { MiniPagination } from '@/components/ui/MiniPagination'

const PAGE_SIZE = 5

function fmtConversions(n) {
  const x = Number(n) || 0
  return Math.abs(x % 1) < 0.001
    ? formatNumber(Math.round(x))
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(x)
}

/** Termos de pesquisa reais que dispararam anúncios (search_term_view). */
export function GoogleSearchTermsBlock() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.searchTerms
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
      <Search size={13} className="text-brand shrink-0" />
      <span className="section-title">Termos de pesquisa</span>
    </div>
  )

  return (
    <BlockCard
      title={titleNode}
      badge={items.length > 0 ? `${items.length} termos` : undefined}
      state={state}
      emptyMessage="Sem termos de pesquisa com cliques ou custo no período."
      errorMessage={String(payload?.error || '')}
      bodyClassName="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-2"
    >
      <p className="shrink-0 text-[9px] leading-snug text-muted-foreground/85 font-sans">
        O que as pessoas realmente digitaram no Google antes de clicar no anúncio.
      </p>
      <div className="overflow-x-auto">
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
            {pageItems.map((t, i) => {
              const rank = (safePage - 1) * PAGE_SIZE + i + 1
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
