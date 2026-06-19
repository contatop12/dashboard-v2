import { Film, Grid, Image, Eye } from 'lucide-react'
import { cn, formatNumber, formatPercent } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { usePagedRows, TablePagination } from '@/components/ui/TablePagination'

const TIPO_ICONS = { Reel: Film, Carrossel: Grid, Feed: Image, Stories: Eye, Post: Image }

function tipoFromTag(tag) {
  const t = String(tag ?? '')
  if (t === 'Reel') return 'Reel'
  if (t === 'Carrossel') return 'Carrossel'
  if (t === 'Stories') return 'Stories'
  if (t === 'Feed') return 'Feed'
  return 'Post'
}

export default function InstagramTopPostsTable() {
  const { loading, data } = usePlatformOverview()
  const posts = Array.isArray(data?.posts) ? data.posts : []

  const { page, setPage, pageSize, setPageSize, totalPages, pageRows, total, rangeStart, rangeEnd } =
    usePagedRows(posts, { storageKey: 'p12_pagesize_ig_top_posts', defaultSize: 10 })

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-card">
      <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-4">
        <span className="section-title">Top publicações</span>
        <span className="text-[10px] font-sans text-muted-foreground">por taxa de engajamento</span>
      </div>

      {loading ? (
        <p className="px-4 py-8 text-center text-[11px] text-muted-foreground">Carregando publicações…</p>
      ) : null}

      {!loading && posts.length === 0 ? (
        <p className="px-4 py-8 text-center text-[11px] text-muted-foreground">
          Nenhuma publicação no período selecionado.
        </p>
      ) : null}

      {!loading && posts.length > 0 ? (
        <>
          <div className="min-h-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface-input">
                  {['Post', 'Tipo', 'Alcance', 'Curtidas', 'Comentários', 'Salvamentos', 'Taxa Eng.'].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        'px-4 py-2 text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground',
                        h === 'Post' ? 'text-left' : 'text-right'
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => {
                  const tipo = tipoFromTag(p.tag)
                  const Icon = TIPO_ICONS[tipo] ?? Image
                  const color = p.tagColor ?? '#64748b'
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-surface-border/50 transition-colors last:border-0 hover:bg-surface-hover/40"
                    >
                      <td className="px-4 py-4 font-sans text-white">{p.name}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Icon size={11} style={{ color }} />
                          <span className="font-mono text-[10px]" style={{ color }}>
                            {p.tag}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-white">{formatNumber(p.reach || p.impressions)}</td>
                      <td className="px-4 py-4 text-right font-mono text-white">{p.likes || '—'}</td>
                      <td className="px-4 py-4 text-right font-mono text-white">{p.comments || '—'}</td>
                      <td className="px-4 py-4 text-right font-mono text-white">{p.saves || '—'}</td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={cn(
                            'font-mono text-xs font-semibold',
                            p.engagementRate >= 10
                              ? 'text-green-400'
                              : p.engagementRate >= 5
                                ? 'text-yellow-400'
                                : 'text-muted-foreground'
                          )}
                        >
                          {formatPercent(p.engagementRate)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
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
            className="shrink-0 border-t border-surface-border px-4 py-2"
          />
        </>
      ) : null}
    </div>
  )
}
