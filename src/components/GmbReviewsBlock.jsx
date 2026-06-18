import { useMemo } from 'react'
import { Star } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { usePagedRows, TablePagination } from '@/components/ui/TablePagination'

function relativeDate(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.round((Date.now() - then) / 86400000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `${days} dias atrás`
  const months = Math.round(days / 30)
  return months <= 1 ? '1 mês atrás' : `${months} meses atrás`
}

export default function GmbReviewsBlock() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.reviews
  const items = useMemo(() => (Array.isArray(payload?.items) ? payload.items : []), [payload])
  const dist = payload?.distribution ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  const maxDist = Math.max(1, ...Object.values(dist).map((n) => Number(n) || 0))

  const { page, setPage, pageSize, setPageSize, totalPages, pageRows, total, rangeStart, rangeEnd } =
    usePagedRows(items, { storageKey: 'p12_pagesize_gmb_reviews', defaultSize: 5 })

  const state = loading ? 'loading' : payload?.error ? 'error' : items.length === 0 && payload?.totalCount == null ? 'empty' : 'ready'

  const titleNode = (
    <div className="flex items-center gap-1.5">
      <Star size={13} className="text-yellow-400 shrink-0" fill="currentColor" />
      <span className="section-title">Avaliações</span>
    </div>
  )

  return (
    <BlockCard
      title={titleNode}
      badge={payload?.averageRating != null ? `${Number(payload.averageRating).toFixed(1)}★ · ${formatNumber(payload?.totalCount || 0)}` : undefined}
      state={state}
      emptyMessage="Sem avaliações para este perfil."
      errorMessage={String(payload?.error || 'Reviews requer My Business API v4 (allowlist).')}
      bodyClassName="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-3"
    >
      <div className="flex shrink-0 flex-col gap-1">
        {[5, 4, 3, 2, 1].map((n) => {
          const v = Number(dist[String(n)]) || 0
          return (
            <div key={n} className="flex items-center gap-2">
              <span className="w-3 shrink-0 font-mono text-[10px] text-muted-foreground">{n}</span>
              <Star size={9} className="shrink-0 text-yellow-400" fill="currentColor" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-border">
                <div className="h-full rounded-full bg-yellow-400" style={{ width: `${(v / maxDist) * 100}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{v}</span>
            </div>
          )
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {pageRows.map((r) => (
          <div key={r.id} className="flex flex-col gap-1.5 border-b border-surface-border pb-3 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-input text-[10px] font-mono text-white">
                  {(r.author || '?')[0]}
                </div>
                <span className="font-sans text-xs font-medium text-white">{r.author}</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: r.rating }, (_, i) => (
                  <Star key={i} size={10} className="text-yellow-400" fill="currentColor" />
                ))}
                <span className="ml-2 font-sans text-[10px] text-muted-foreground">{relativeDate(r.date)}</span>
              </div>
            </div>
            {r.comment ? <p className="font-sans text-[11px] leading-relaxed text-muted-foreground">{r.comment}</p> : null}
          </div>
        ))}
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
