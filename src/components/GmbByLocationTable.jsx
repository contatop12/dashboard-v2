import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, MapPin } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { usePagedRows, TablePagination } from '@/components/ui/TablePagination'

const COLS = [
  { id: 'label', label: 'Local', align: 'left' },
  { id: 'views', label: 'Visualizações', align: 'right' },
  { id: 'calls', label: 'Ligações', align: 'right' },
  { id: 'website', label: 'Site', align: 'right' },
  { id: 'directions', label: 'Rotas', align: 'right' },
]

export default function GmbByLocationTable() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.byLocation
  const rawItems = Array.isArray(payload?.items) ? payload.items : []
  const [sort, setSort] = useState({ id: 'views', desc: true })

  const items = useMemo(() => {
    const arr = [...rawItems]
    arr.sort((a, b) => {
      const av = a[sort.id]
      const bv = b[sort.id]
      if (sort.id === 'label') return sort.desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv))
      return sort.desc ? (Number(bv) || 0) - (Number(av) || 0) : (Number(av) || 0) - (Number(bv) || 0)
    })
    return arr
  }, [rawItems, sort])

  const { page, setPage, pageSize, setPageSize, totalPages, pageRows, total, rangeStart, rangeEnd } =
    usePagedRows(items, { storageKey: 'p12_pagesize_gmb_locations', defaultSize: 10 })

  if (!loading && rawItems.length <= 1 && !payload?.error) return null

  const onSort = (id) => setSort((p) => (p.id === id ? { id, desc: !p.desc } : { id, desc: true }))
  const state = loading ? 'loading' : payload?.error ? 'error' : items.length === 0 ? 'empty' : 'ready'

  const titleNode = (
    <div className="flex items-center gap-1.5">
      <MapPin size={13} className="text-[#34A853] shrink-0" />
      <span className="section-title">Resultados por local</span>
    </div>
  )

  return (
    <BlockCard
      title={titleNode}
      state={state}
      emptyMessage="Sem dados por local no período."
      errorMessage={String(payload?.error || '')}
      bodyClassName="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-2"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-xs">
          <thead>
            <tr className="text-[9px] uppercase tracking-wider text-muted-foreground">
              {COLS.map((c) => (
                <th key={c.id} className={cn('px-2 py-2 font-semibold', c.align === 'right' ? 'text-right' : 'text-left')}>
                  <button
                    type="button"
                    className={cn('inline-flex items-center gap-1', c.align === 'right' && 'justify-end w-full')}
                    onClick={() => onSort(c.id)}
                  >
                    {c.label}
                    {sort.id === c.id ? (
                      sort.desc ? <ArrowDown size={10} className="text-brand" /> : <ArrowUp size={10} className="text-brand" />
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                <td className="max-w-[220px] px-2 py-2 align-top">
                  <span className="block truncate font-sans text-[11px] text-white" title={r.label}>{r.label}</span>
                </td>
                <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-white">{formatNumber(r.views)}</td>
                <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-white">{formatNumber(r.calls)}</td>
                <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-white">{formatNumber(r.website)}</td>
                <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-white">{formatNumber(r.directions)}</td>
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
