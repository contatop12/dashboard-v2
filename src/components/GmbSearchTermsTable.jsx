import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { usePagedRows, TablePagination } from '@/components/ui/TablePagination'

export default function GmbSearchTermsTable() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.searchKeywords
  const [desc, setDesc] = useState(true)

  const items = useMemo(() => {
    const list = Array.isArray(payload?.items) ? payload.items : []
    return [...list].sort((a, b) => (desc ? b.impressions - a.impressions : a.impressions - b.impressions))
  }, [payload, desc])

  const { page, setPage, pageSize, setPageSize, totalPages, pageRows, total, rangeStart, rangeEnd } =
    usePagedRows(items, { storageKey: 'p12_pagesize_gmb_terms', defaultSize: 10 })

  const state = loading ? 'loading' : payload?.error ? 'error' : items.length === 0 ? 'empty' : 'ready'

  const titleNode = (
    <div className="flex items-center gap-1.5">
      <Search size={13} className="text-[#34A853] shrink-0" />
      <span className="section-title">Termos de busca</span>
    </div>
  )

  return (
    <BlockCard
      title={titleNode}
      badge={payload?.monthsCovered || undefined}
      state={state}
      emptyMessage="Sem termos de busca no período (perfil pode ter pouco volume)."
      errorMessage={String(payload?.error || '')}
      bodyClassName="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-2"
    >
      <p className="shrink-0 text-[9px] text-muted-foreground font-sans">
        Como as pessoas acharam o perfil. Impressões mensais; “~” = valor aproximado (baixo volume).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] border-collapse text-xs">
          <thead>
            <tr className="text-[9px] uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-2 text-left font-semibold">Termo</th>
              <th className="px-2 py-2 text-right font-semibold">
                <button type="button" className="inline-flex items-center gap-1" onClick={() => setDesc((d) => !d)}>
                  Impressões
                  {desc ? <ArrowDown size={10} className="text-brand" /> : <ArrowUp size={10} className="text-brand" />}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((t, i) => (
              <tr key={`${t.keyword}-${i}`} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                <td className="max-w-[260px] px-2 py-2 align-top">
                  <div className="flex items-baseline gap-1.5">
                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-muted-foreground/70">{rangeStart + i}.</span>
                    <span className="block truncate font-sans text-[11px] text-foreground" title={t.keyword}>
                      {t.keyword}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-foreground">
                  {t.approximate ? '~' : ''}
                  {formatNumber(t.impressions)}
                </td>
              </tr>
            ))}
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
