import { useMemo, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'

const METRICS = [
  { id: 'views', label: 'Visualizações', color: '#34A853' },
  { id: 'calls', label: 'Ligações', color: '#4285F4' },
  { id: 'website', label: 'Cliques no site', color: '#F5C518' },
  { id: 'directions', label: 'Rotas', color: '#9B8EFF' },
  { id: 'conversations', label: 'Conversas', color: '#FF6B6B' },
]

const LS_KEY = 'p12_gmb_daily_metric'

function readMetric() {
  try {
    const v = localStorage.getItem(LS_KEY)
    if (v && METRICS.some((m) => m.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'views'
}

export default function GmbDailyChart() {
  const { loading, data } = usePlatformOverview()
  const [metric, setMetric] = useState(readMetric)
  const def = METRICS.find((m) => m.id === metric) ?? METRICS[0]

  const chartData = useMemo(() => {
    const daily = Array.isArray(data?.daily) ? data.daily : []
    return daily.map((d) => {
      let dia = d.date
      try {
        dia = format(parse(d.date, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })
      } catch {
        /* keep raw */
      }
      return { dia, valor: Number(d[metric]) || 0 }
    })
  }, [data?.daily, metric])

  const onPick = (id) => {
    setMetric(id)
    try {
      localStorage.setItem(LS_KEY, id)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-surface-border bg-surface-card p-4">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <span className="section-title">Desempenho diário</span>
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-surface-input p-0.5">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.id)}
              className={cn(
                'rounded px-2 py-1 font-mono text-[10px] transition-all',
                metric === m.id ? 'bg-brand font-semibold text-[#0F0F0F]' : 'text-muted-foreground hover:text-white'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? <p className="mb-2 text-[10px] text-muted-foreground">Carregando série…</p> : null}
      <div className="min-h-[11rem] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gmbGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={def.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={def.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v) => [formatNumber(Number(v) || 0), def.label]}
              contentStyle={{ background: '#1E1E1E', border: '1px solid #2C2C2C', borderRadius: 8, fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="valor"
              name={def.label}
              stroke={def.color}
              strokeWidth={2}
              fill="url(#gmbGrad)"
              dot={false}
              activeDot={{ r: 3, fill: def.color, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
