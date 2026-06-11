import { useEffect, useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { MiniPagination } from '@/components/ui/MiniPagination'

const MIN_IMPRESSIONS = 10
const PAGE_SIZE = 5
/** Altura mínima alinhada ao corpo de 5 linhas do bloco Termos de pesquisa. */
const PAIRED_BODY_MIN_H = 'min-h-[15rem]'

function pctLabel(p) {
  if (p == null || Number.isNaN(Number(p))) return '—'
  const n = Number(p)
  if (n > 0 && n < 1) return '<1%'
  return `${Math.round(n)}%`
}

function barColor(pct) {
  if (pct >= 60) return '#4ade80'
  if (pct >= 30) return '#F5C518'
  return '#4285F4'
}

/**
 * Ranking de 1º lugar absoluto por palavra-chave.
 * Google não expõe contagem direta de "ranqueou em 1º"; expõe a fração de
 * impressões em 1º lugar absoluto — mostramos % + estimativa de impressões.
 */
export function GoogleKeywordPositionBlock() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.topKeywords
  const items = useMemo(() => {
    const list = Array.isArray(payload?.items) ? payload.items : []
    return list
      .filter((k) => k.impressions >= MIN_IMPRESSIONS && k.absTopPct != null)
      .sort((a, b) => b.absTopPct - a.absTopPct || b.impressions - a.impressions)
  }, [payload])
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
      <Trophy size={13} className="text-brand shrink-0" />
      <span className="section-title">Posição de destaque · 1º lugar</span>
    </div>
  )

  return (
    <BlockCard
      title={titleNode}
      badge={items.length > 0 ? `${items.length} palavras` : undefined}
      state={state}
      emptyMessage={`Sem palavras-chave de pesquisa com pelo menos ${MIN_IMPRESSIONS} impressões no período.`}
      errorMessage={String(payload?.error || '')}
      className="h-full"
      bodyClassName="flex min-h-0 flex-1 flex-col gap-2 px-3 sm:px-4 pb-3 sm:pb-4"
    >
      <p className="shrink-0 text-[9px] leading-snug text-muted-foreground/85 font-sans">
        % das impressões em que o anúncio apareceu em <strong className="text-foreground/80">1º lugar absoluto</strong>{' '}
        na busca (topo da página, acima de todos). Estimativa de impressões em 1º entre parênteses.
      </p>
      <div className={cn('flex flex-col gap-2', PAIRED_BODY_MIN_H)}>
        {pageItems.map((kw) => {
          const pct = Number(kw.absTopPct) || 0
          return (
            <div key={`${kw.campaignId}-${kw.keyword}`} className="min-w-0">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span
                  className="min-w-0 flex-1 truncate font-sans text-[11px] text-foreground"
                  title={`${kw.keyword} — ${kw.campaignName}`}
                >
                  {kw.keyword}
                </span>
                <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-foreground">
                  {pctLabel(pct)}
                  <span className="ml-1 font-normal text-muted-foreground">
                    (~{formatNumber(kw.absTopImpressions)} impr.)
                  </span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.min(100, Math.max(2, pct))}%`, backgroundColor: barColor(pct) }}
                />
              </div>
              <span className={cn('mt-0.5 block truncate text-right text-[9px] text-muted-foreground/70')}>
                topo da página: {pctLabel(kw.topPct)} · {formatNumber(kw.impressions)} impressões
              </span>
            </div>
          )
        })}
      </div>
      <MiniPagination
        page={safePage}
        totalPages={totalPages}
        onPage={setPage}
        className="mt-auto border-t border-surface-border/80 pt-1"
      />
    </BlockCard>
  )
}
