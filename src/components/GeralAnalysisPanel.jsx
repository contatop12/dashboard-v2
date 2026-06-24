import { useId, useMemo, useState } from 'react'
import { Settings2 } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { timelineData } from '@/data/mockData'

const GERAL_DAILY_CHART_LS = 'p12_geral_daily_chart_mode'
const GERAL_DAILY_VISIBLE_MODES_LS = 'p12_geral_daily_visible_modes'

const GERAL_CHART_MODES = [
  { id: 'leads_custo', label: 'Leads e custo/lead' },
  { id: 'investimento', label: 'Investimento' },
  { id: 'leads', label: 'Leads' },
]

function readGeralChartMode() {
  try {
    const v = localStorage.getItem(GERAL_DAILY_CHART_LS)?.trim()
    if (v && GERAL_CHART_MODES.some((m) => m.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'leads_custo'
}

function readGeralVisibleChartModes() {
  try {
    const raw = localStorage.getItem(GERAL_DAILY_VISIBLE_MODES_LS)
    if (!raw) return GERAL_CHART_MODES.map((m) => m.id)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return GERAL_CHART_MODES.map((m) => m.id)
    const allowed = new Set(GERAL_CHART_MODES.map((m) => m.id))
    const filtered = parsed.filter((id) => typeof id === 'string' && allowed.has(id))
    return filtered.length > 0 ? filtered : GERAL_CHART_MODES.map((m) => m.id)
  } catch {
    return GERAL_CHART_MODES.map((m) => m.id)
  }
}

function mapGeralTimelineToChart(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return [{ dia: '—', leads: 0, custo: 0, gasto: 0 }]
  }
  return data.map((d) => ({
    dia: d.date,
    leads: Number(d.leads) || 0,
    custo: Number(d.custo) || 0,
    gasto: Math.round((Number(d.leads) || 0) * (Number(d.custo) || 0) * 100) / 100,
  }))
}

function GeralDailyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-xs shadow-xl">
      <p className="mb-2 font-sans text-muted-foreground">{label}</p>
      {payload.map((p) => {
        const key = String(p.dataKey)
        let formatted = p.value
        if (key === 'custo' || key === 'gasto') formatted = formatCurrency(Number(p.value) || 0)
        else if (key === 'leads') formatted = formatNumber(Math.round(Number(p.value) || 0))
        return (
          <div key={key} className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="font-sans text-muted-foreground">{p.name}:</span>
            <span className="font-mono font-semibold text-white">{formatted}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function GeralAnalysisPanel() {
  const gid = useId().replace(/:/g, '')
  const gradLeads = `geralLeads-${gid}`
  const gradGasto = `geralGasto-${gid}`
  const chartData = useMemo(() => mapGeralTimelineToChart(timelineData), [])
  const [chartMode, setChartMode] = useState(readGeralChartMode)
  const [visibleModes, setVisibleModes] = useState(readGeralVisibleChartModes)
  const [showModePicker, setShowModePicker] = useState(false)

  const availableModes = useMemo(
    () => GERAL_CHART_MODES.filter((m) => visibleModes.includes(m.id)),
    [visibleModes]
  )

  const modeLabel = GERAL_CHART_MODES.find((m) => m.id === chartMode)?.label ?? 'Série diária'
  const isDual = chartMode === 'leads_custo'

  const onChartModeChange = (modeId) => {
    setChartMode(modeId)
    try {
      localStorage.setItem(GERAL_DAILY_CHART_LS, modeId)
    } catch {
      /* ignore */
    }
  }

  const onToggleModeVisibility = (modeId) => {
    setVisibleModes((prev) => {
      const has = prev.includes(modeId)
      if (has && prev.length === 1) return prev
      const next = has ? prev.filter((id) => id !== modeId) : [...prev, modeId]
      try {
        localStorage.setItem(GERAL_DAILY_VISIBLE_MODES_LS, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const chartModeTabs = (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-white/[0.06] bg-[#141414] p-1 [scrollbar-width:thin]">
      {availableModes.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChartModeChange(m.id)}
          className={cn(
            'shrink-0 rounded-md px-2.5 py-1 text-[9px] font-medium font-sans whitespace-nowrap transition-colors',
            chartMode === m.id
              ? 'bg-brand/20 text-brand ring-1 ring-brand/30'
              : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white'
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  )

  const chartLegend = isDual ? (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-sans text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-brand" aria-hidden /> Leads
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#9B8EFF]" aria-hidden /> Custo / lead
      </span>
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-sans text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: chartMode === 'investimento' ? '#4285F4' : '#F5C518' }}
          aria-hidden
        />
        {modeLabel}
      </span>
    </div>
  )

  const chartBody = (
    <div className="google-chart-canvas h-[180px] w-full shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        {isDual ? (
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={gradLeads} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5C518" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F5C518" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="dia"
              tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 9, fill: '#888', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 9, fill: '#888', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v) => `R$${v}`}
            />
            <Tooltip content={<GeralDailyTooltip />} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="leads"
              name="Leads"
              stroke="#F5C518"
              strokeWidth={2}
              fill={`url(#${gradLeads})`}
              dot={false}
              activeDot={{ r: 3, fill: '#F5C518', strokeWidth: 0 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="custo"
              name="Custo / lead"
              stroke="#9B8EFF"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3, fill: '#9B8EFF', strokeWidth: 0 }}
            />
          </ComposedChart>
        ) : (
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={gradGasto} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartMode === 'investimento' ? '#4285F4' : '#F5C518'} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartMode === 'investimento' ? '#4285F4' : '#F5C518'} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="dia"
              tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<GeralDailyTooltip />} />
            <Area
              type="monotone"
              dataKey={chartMode === 'investimento' ? 'gasto' : 'leads'}
              name={chartMode === 'investimento' ? 'Investimento' : 'Leads'}
              stroke={chartMode === 'investimento' ? '#4285F4' : '#F5C518'}
              strokeWidth={2}
              fill={`url(#${gradGasto})`}
              dot={false}
              activeDot={{
                r: 3,
                fill: chartMode === 'investimento' ? '#4285F4' : '#F5C518',
                strokeWidth: 0,
              }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )

  return (
    <div className="google-analysis-panel-v2">
      <div className="google-analysis-row-main !grid-cols-1">
        <div className="meta-analysis-cell flex min-h-0 flex-col">
          <div className="mb-2 flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[11px] font-medium text-foreground font-sans">Evolução no período</span>
              <p className="text-[9px] text-muted-foreground font-sans">
                Todos os canais · {modeLabel}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {chartModeTabs}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModePicker((v) => !v)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.04] text-muted-foreground hover:text-foreground"
                  title="Configurar variações"
                  aria-label="Configurar variações do gráfico"
                >
                  <Settings2 size={14} />
                </button>
                {showModePicker ? (
                  <div className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-white/[0.1] bg-[#141414] p-2 shadow-lg">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Variações visíveis
                    </p>
                    <div className="flex flex-col gap-1">
                      {GERAL_CHART_MODES.map((mode) => {
                        const checked = visibleModes.includes(mode.id)
                        return (
                          <label key={mode.id} className="flex cursor-pointer items-center gap-2 text-[11px] text-foreground">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleModeVisibility(mode.id)}
                              className="h-3.5 w-3.5 rounded border-white/20 bg-transparent"
                            />
                            <span>{mode.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {chartLegend}
          <div className="mt-1 shrink-0">{chartBody}</div>
        </div>
      </div>
    </div>
  )
}
