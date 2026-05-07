import { TrendingUp, TrendingDown, DollarSign, Target, Eye, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'
import { kpiData, kpiDataPrevious } from '@/data/mockData'
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'

const METRIC_KEY = {
  investimento: 'investimento',
  resultado: 'resultado',
  custo: 'custoResultado',
  retorno: 'retorno',
  cpm: 'cpm',
  ctr: 'ctr',
}

export const GERAL_KPI_CARDS = [
  { id: 'investimento', label: 'Investimento', icon: DollarSign, accent: 'brand' },
  { id: 'resultado', label: 'Resultado', icon: Target, accent: 'brand' },
  { id: 'custo', label: 'Custo / Resultado', icon: DollarSign, accent: 'purple' },
  { id: 'retorno', label: 'Retorno', icon: TrendingUp, accent: 'brand' },
  { id: 'cpm', label: 'CPM', icon: Eye, accent: 'purple' },
  { id: 'ctr', label: 'CTR', icon: Percent, accent: 'brand' },
]

export default function GeralKpiCard({ id, label, icon: Icon, accent }) {
  const period = useDashboardBlockPeriod()
  const key = METRIC_KEY[id] ?? id
  const src = period === 'previous' ? kpiDataPrevious : kpiData
  const row = src[key]
  if (!row) return null
  const value = row.formatted
  const delta = row.delta
  const deltaLabel = row.deltaLabel
  const isPositive = delta > 0
  const isNegative = delta < 0

  return (
    <div className="kpi-card min-w-0 w-full shrink-0 flex flex-col">
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span className="kpi-label truncate">{label}</span>
        <div className={cn('w-6 h-6 shrink-0 rounded-md flex items-center justify-center', accent === 'brand' ? 'bg-brand/15' : 'bg-purple-accent/15')}>
          <Icon size={12} className={accent === 'brand' ? 'text-brand' : 'text-accent-purple'} />
        </div>
      </div>

      <div className="flex items-end justify-between mt-1 gap-2 min-w-0">
        <span className="kpi-value truncate tabular-nums">{value}</span>
        {delta !== undefined && (
          <div className={cn('flex shrink-0 items-center gap-0.5 text-xs font-mono mb-0.5', isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-muted-foreground')}>
            {isPositive ? <TrendingUp size={11} /> : isNegative ? <TrendingDown size={11} /> : null}
            <span>{isPositive ? '+' : ''}{delta.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground font-sans truncate">{deltaLabel}</span>
    </div>
  )
}
