import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { kpiData, kpiDataPrevious } from '@/data/mockData'
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'
import { MetricInfo } from '@/components/ui/MetricInfo'

const METRIC_KEY = {
  investimento: 'investimento',
  resultado: 'resultado',
  custo: 'custoResultado',
  retorno: 'retorno',
  cpm: 'cpm',
  ctr: 'ctr',
}

export const GERAL_KPI_CARDS = [
  { id: 'investimento', label: 'Investimento', infoKey: 'invest' },
  { id: 'resultado', label: 'Resultado', infoKey: 'results' },
  { id: 'custo', label: 'Custo / Resultado', infoKey: 'cpl' },
  { id: 'retorno', label: 'Retorno', infoKey: 'roas' },
  { id: 'cpm', label: 'CPM', infoKey: 'cpm' },
  { id: 'ctr', label: 'CTR', infoKey: 'ctr' },
]

export default function GeralKpiCard({ id, label, infoKey, variant = 'metric', fieldKey }) {
  const period = useDashboardBlockPeriod()
  const src = period === 'previous' ? kpiDataPrevious : kpiData

  let row
  if (variant === 'field' && fieldKey) {
    row = src[fieldKey]
  } else {
    const key = METRIC_KEY[id] ?? id
    row = src[key]
  }

  if (!row) return null
  const value = row.formatted
  const delta = row.delta
  const deltaLabel = row.deltaLabel
  const isPositive = delta > 0
  const isNegative = delta < 0

  return (
    <div className={cn('kpi-card min-w-0 w-full shrink-0', period === 'previous' && 'kpi-card--compare')}>
      <span className="kpi-label inline-flex items-center gap-1 truncate">
        <span className="block truncate">{label}</span>
        {infoKey && <MetricInfo metricKey={infoKey} size={11} />}
      </span>
      <span className="kpi-value block truncate tabular-nums">{value}</span>
      {delta !== undefined && (
        <div className="kpi-delta-row min-w-0">
          <div
            className={cn(
              'inline-flex shrink-0 items-center gap-1',
              isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-muted-foreground'
            )}
          >
            {isPositive ? <TrendingUp size={12} strokeWidth={2} /> : isNegative ? <TrendingDown size={12} strokeWidth={2} /> : null}
            <span>
              {isPositive ? '+' : ''}
              {delta.toFixed(1)}%
            </span>
          </div>
          {deltaLabel ? <span className="kpi-delta-note min-w-0 truncate">{deltaLabel}</span> : null}
        </div>
      )}
    </div>
  )
}
