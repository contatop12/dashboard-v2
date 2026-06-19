import { useMemo, useState } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import FunnelGeral from '@/components/FunnelGeral'

const PLACEMENT_COLORS = ['#F5C518', '#9B8EFF', '#4A9BFF', '#FF6B6B', '#22c55e', '#f97316']
const EMPTY_CHART = [{ dia: '—', gasto: 0, alcance: 0, leads: 0, impressoes: 0 }]

function mapMetaDailyToChart(daily) {
  if (!Array.isArray(daily) || daily.length === 0) return EMPTY_CHART
  return daily.map((d) => {
    let dia = d.date || '—'
    try {
      if (d.date) dia = format(parse(d.date, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })
    } catch {
      /* keep raw */
    }
    return {
      dia,
      gasto: Math.round(Number(d.spend) * 100) / 100,
      alcance: Math.round(Number(d.reach) || 0),
      leads: Math.round(Number(d.leads) || 0),
      impressoes: Math.round(Number(d.impressions) || 0),
    }
  })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-xs shadow-xl">
      <p className="mb-2 font-sans text-muted-foreground">Dia {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-sans text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function MetaDailyChart({ activeChart, setActiveChart }) {
  const { loading, data } = usePlatformOverview()
  const chartData = useMemo(() => mapMetaDailyToChart(data?.daily), [data?.daily])
  const chartKey =
    activeChart === 'gasto' ? 'gasto' : activeChart === 'alcance' ? 'alcance' : activeChart === 'leads' ? 'leads' : 'impressoes'
  const chartName =
    activeChart === 'gasto' ? 'Gasto' : activeChart === 'alcance' ? 'Alcance' : activeChart === 'leads' ? 'Leads' : 'Impressões'

  return (
    <div className="meta-analysis-cell flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <span className="section-title">Desempenho Diário</span>
        <div className="flex items-center gap-1 rounded-md bg-surface-input p-0.5">
          {[
            { k: 'gasto', l: 'Gasto' },
            { k: 'alcance', l: 'Alcance' },
            { k: 'leads', l: 'Leads' },
          ].map(({ k, l }) => (
            <button
              key={k}
              type="button"
              onClick={() => setActiveChart(k)}
              className={cn(
                'rounded px-2 py-1 font-mono text-[10px] transition-all',
                activeChart === k ? 'bg-brand font-semibold text-[#0F0F0F]' : 'text-muted-foreground hover:text-white'
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {loading ? <p className="mb-2 text-[10px] text-muted-foreground">Carregando série…</p> : null}
      <div className="min-h-[11rem] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5C518" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#F5C518" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={chartKey}
              name={chartName}
              stroke="#F5C518"
              strokeWidth={2}
              fill="url(#metaGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#F5C518', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function MetaPlacements() {
  const { loading, data } = usePlatformOverview()
  const raw = Array.isArray(data?.placements) ? data.placements : []
  const placementRows = raw.map((p, i) => ({
    name: p.name || '—',
    value: typeof p.value === 'number' ? p.value : 0,
    color: PLACEMENT_COLORS[i % PLACEMENT_COLORS.length],
  }))
  const hasData = placementRows.length > 0
  const pieData = hasData ? placementRows : [{ name: '—', value: 100, color: '#333333' }]

  return (
    <div className="meta-analysis-cell flex h-full min-h-0 flex-col">
      <span className="section-title mb-3 block shrink-0">Posicionamentos</span>
      {loading ? <p className="text-[10px] text-muted-foreground">Carregando…</p> : null}
      {!hasData && !loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <div className="h-16 w-16 rounded-full border border-dashed border-white/10" />
          <p className="max-w-[12rem] text-[10px] leading-relaxed text-muted-foreground">
            Sem dados de plataforma no período.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center gap-3">
          <div className="h-[7.5rem] w-[7.5rem] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={52}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((p, i) => (
                    <Cell key={i} fill={p.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => `${v}%`}
                  contentStyle={{ background: '#1E1E1E', border: '1px solid #2C2C2C', borderRadius: 8, fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {placementRows.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="flex-1 truncate font-sans text-[10px] text-muted-foreground">{p.name}</span>
                <span className="font-mono text-[11px] text-white">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MetaAnalysisPanel({ embedded = false }) {
  const [activeChart, setActiveChart] = useState('gasto')

  return (
    <div className={cn('meta-analysis-panel', embedded && 'meta-analysis-panel--embedded')}>
      <div className="meta-analysis-top">
        <MetaDailyChart activeChart={activeChart} setActiveChart={setActiveChart} />
        <MetaPlacements />
      </div>
      <div className="meta-analysis-bottom">
        <FunnelGeral embedded />
      </div>
    </div>
  )
}
