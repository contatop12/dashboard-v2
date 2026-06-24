import { useMemo } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { buildGeralChannelSummary } from '@/lib/geralOverviewMetrics'

function SpendDelta({ deltaPct }) {
  if (deltaPct === null || deltaPct === undefined || Number.isNaN(Number(deltaPct))) return null
  const n = Number(deltaPct)
  const isUp = n > 0
  const isDown = n < 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-mono text-[9px] font-medium',
        isUp && 'text-emerald-400',
        isDown && 'text-red-400',
        !isUp && !isDown && 'text-muted-foreground'
      )}
    >
      {isUp ? <TrendingUp size={9} /> : isDown ? <TrendingDown size={9} /> : null}
      {n >= 0 ? '+' : ''}
      {n.toFixed(1)}%
    </span>
  )
}

function ChannelCard({ row, showDelta }) {
  const accountsLabel =
    row.accountCount === 1 ? '1 conta' : row.accountCount > 0 ? `${row.accountCount} contas` : null

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-foreground font-sans">{row.name}</p>
            {accountsLabel ? (
              <p className="text-[9px] text-muted-foreground font-sans">{accountsLabel}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="font-mono text-sm font-semibold tabular-nums text-white">
            {formatCurrency(row.spend)}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{row.spendShare.toFixed(0)}% do gasto</span>
          {showDelta ? <SpendDelta deltaPct={row.spendDeltaPct} /> : null}
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(row.spendShare, row.spend > 0 ? 2 : 0)}%`, backgroundColor: row.color }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] font-sans text-muted-foreground">
        <span>
          <strong className="font-mono font-medium text-foreground/90">
            {formatNumber(Math.round(row.results))}
          </strong>{' '}
          resultados ({row.resultsShare.toFixed(0)}%)
        </span>
        <span>
          Custo / resultado{' '}
          <strong className="font-mono font-medium text-foreground/90">
            {row.costPerResult != null ? formatCurrency(row.costPerResult) : '—'}
          </strong>
        </span>
      </div>
    </div>
  )
}

export default function GeralChannelSummary() {
  const period = useDashboardBlockPeriod()
  const { comparePrimaryKpi } = useDashboardFilters()
  const { loading, data } = usePlatformOverview()
  const isPrevious = period === 'previous'
  const showDelta = comparePrimaryKpi && !isPrevious

  const summary = useMemo(
    () => buildGeralChannelSummary(data, { isPrevious, compareEnabled: comparePrimaryKpi }),
    [data, isPrevious, comparePrimaryKpi]
  )

  if (loading && summary.rows.length === 0) {
    return (
      <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <p className="text-[10px] text-muted-foreground font-sans">Carregando divisão por plataforma…</p>
      </div>
    )
  }

  if (summary.rows.length === 0) {
    return null
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Meta vs Google
          </p>
          <p className="text-[10px] text-muted-foreground/85 font-sans">
            Participação no investimento e nos resultados do período
          </p>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-foreground/75">
          {formatCurrency(summary.totalSpend)} · {formatNumber(Math.round(summary.totalResults))} resultados
        </span>
      </div>
      <div
        className={cn(
          'grid gap-3',
          summary.rows.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
        )}
      >
        {summary.rows.map((row) => (
          <ChannelCard key={row.id} row={row} showDelta={showDelta} />
        ))}
      </div>
    </div>
  )
}
