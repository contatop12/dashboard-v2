import { TrendingUp, TrendingDown, DollarSign, Target, Eye, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'
import { kpiData } from '@/data/mockData'

export const GERAL_KPI_CARDS = [
  { id: 'investimento', label: 'Investimento', value: kpiData.investimento.formatted, delta: kpiData.investimento.delta, deltaLabel: kpiData.investimento.deltaLabel, icon: DollarSign, accent: 'brand' },
  { id: 'resultado', label: 'Resultado', value: kpiData.resultado.formatted, delta: kpiData.resultado.delta, deltaLabel: kpiData.resultado.deltaLabel, icon: Target, accent: 'brand' },
  { id: 'custo', label: 'Custo / Resultado', value: kpiData.custoResultado.formatted, delta: kpiData.custoResultado.delta, deltaLabel: kpiData.custoResultado.deltaLabel, icon: DollarSign, accent: 'purple' },
  { id: 'retorno', label: 'Retorno', value: kpiData.retorno.formatted, delta: kpiData.retorno.delta, deltaLabel: kpiData.retorno.deltaLabel, icon: TrendingUp, accent: 'brand' },
  { id: 'cpm', label: 'CPM', value: kpiData.cpm.formatted, delta: kpiData.cpm.delta, deltaLabel: kpiData.cpm.deltaLabel, icon: Eye, accent: 'purple' },
  { id: 'ctr', label: 'CTR', value: kpiData.ctr.formatted, delta: kpiData.ctr.delta, deltaLabel: kpiData.ctr.deltaLabel, icon: Percent, accent: 'brand' },
]

export default function GeralKpiCard({ label, value, delta, deltaLabel, icon: Icon, accent }) {
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
