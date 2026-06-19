import { useEffect, useId, useMemo, useState } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Settings2 } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { FunnelChart } from '@/components/FunnelChart'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { PieChart, Pie, Cell, Tooltip as RechartsPieTooltip, ResponsiveContainer as PieResponsiveContainer } from 'recharts'

const META_BLUE = '#1877F2'
const META_GREEN = '#34A853'

const META_DAILY_CHART_LS = 'p12_meta_ads_daily_chart_mode'
const META_DAILY_VISIBLE_MODES_LS = 'p12_meta_ads_daily_visible_modes'

const META_CHART_MODES = [
  { id: 'cliques_impressoes', label: 'Cliques e impressões' },
  { id: 'gasto', label: 'Investimento' },
  { id: 'alcance_leads', label: 'Alcance e leads' },
]

const PLACEMENT_COLORS = ['#F5C518', '#9B8EFF', '#4A9BFF', '#FF6B6B', '#22c55e', '#f97316']

function readMetaChartMode() {
  try {
    const v = localStorage.getItem(META_DAILY_CHART_LS)?.trim()
    if (v && META_CHART_MODES.some((m) => m.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'cliques_impressoes'
}

function readMetaVisibleChartModes() {
  try {
    const raw = localStorage.getItem(META_DAILY_VISIBLE_MODES_LS)
    if (!raw) return META_CHART_MODES.map((m) => m.id)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return META_CHART_MODES.map((m) => m.id)
    const allowed = new Set(META_CHART_MODES.map((m) => m.id))
    const filtered = parsed.filter((id) => typeof id === 'string' && allowed.has(id))
    return filtered.length > 0 ? filtered : META_CHART_MODES.map((m) => m.id)
  } catch {
    return META_CHART_MODES.map((m) => m.id)
  }
}

function mapMetaDailyToChart(daily) {
  if (!Array.isArray(daily) || daily.length === 0) {
    return [{ dia: '—', gasto: 0, alcance: 0, leads: 0, impressoes: 0, cliques: 0 }]
  }
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
      cliques: Math.round(Number(d.clicks) || 0),
    }
  })
}

function sumMetaDailyTotals(daily) {
  if (!Array.isArray(daily)) {
    return { impressions: 0, clicks: 0, leads: 0, spend: 0, reach: 0 }
  }
  return daily.reduce(
    (acc, d) => ({
      impressions: acc.impressions + Math.round(Number(d.impressions) || 0),
      clicks: acc.clicks + Math.round(Number(d.clicks) || 0),
      leads: acc.leads + (Number(d.leads) || 0),
      spend: acc.spend + (Number(d.spend) || 0),
      reach: acc.reach + Math.round(Number(d.reach) || 0),
    }),
    { impressions: 0, clicks: 0, leads: 0, spend: 0, reach: 0 }
  )
}

function buildMetaFunnelStages(totals) {
  const { impressions: i, clicks: c, leads: l } = totals
  return [
    { label: 'Impressões', value: Math.max(0, i), displayValue: formatNumber(Math.round(Math.max(0, i))) },
    { label: 'Cliques', value: Math.max(0, c), displayValue: formatNumber(Math.round(Math.max(0, c))) },
    { label: 'Leads', value: Math.max(0, l), displayValue: formatNumber(Math.round(Math.max(0, l))) },
  ]
}

function funnelPercentLabel(p) {
  if (p <= 0 || Number.isNaN(p)) return '0%'
  if (p < 0.05) return '<0,1%'
  if (p < 1) return `${p.toFixed(2).replace('.', ',')}%`
  if (p < 10) return `${p.toFixed(1).replace('.', ',')}%`
  return `${Math.round(p)}%`
}

function MetaDailyChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-sans text-muted-foreground">Dia {label}</p>
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

function MetaDailyChart({ embedded = false }) {
  const gid = useId().replace(/:/g, '')
  const gradA = `metaDailyA-${gid}`
  const gradB = `metaDailyB-${gid}`
  const { loading, data } = usePlatformOverview()
  const chartData = useMemo(() => mapMetaDailyToChart(data?.daily), [data?.daily])
  const [chartMode, setChartMode] = useState(readMetaChartMode)
  const [visibleModes, setVisibleModes] = useState(readMetaVisibleChartModes)
  const [showModePicker, setShowModePicker] = useState(false)

  const modeLabel = META_CHART_MODES.find((m) => m.id === chartMode)?.label ?? 'Série diária'

  const onChartModeChange = (modeId) => {
    setChartMode(modeId)
    try {
      localStorage.setItem(META_DAILY_CHART_LS, modeId)
    } catch {
      /* ignore */
    }
  }

  const onToggleModeVisibility = (modeId) => {
    setVisibleModes((prev) => {
      const next = prev.includes(modeId) ? prev.filter((id) => id !== modeId) : [...prev, modeId]
      const safe = next.length > 0 ? next : [modeId]
      try {
        localStorage.setItem(META_DAILY_VISIBLE_MODES_LS, JSON.stringify(safe))
      } catch {
        /* ignore */
      }
      return safe
    })
  }

  useEffect(() => {
    if (!visibleModes.includes(chartMode) && visibleModes[0]) {
      onChartModeChange(visibleModes[0])
    }
  }, [visibleModes, chartMode])

  const chartModeTabs = (
    <div className="flex flex-wrap items-center gap-1 rounded-md bg-surface-input p-0.5">
      {META_CHART_MODES.filter((m) => visibleModes.includes(m.id)).map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onChartModeChange(mode.id)}
          className={cn(
            'rounded px-2 py-1 font-mono text-[10px] transition-all',
            chartMode === mode.id ? 'bg-brand font-semibold text-[#0F0F0F]' : 'text-muted-foreground hover:text-white'
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )

  const chartBody = (
    <div className={cn('google-chart-canvas', embedded ? 'h-[9.5rem]' : 'h-48')}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={gradA} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={META_BLUE} stopOpacity={0.28} />
              <stop offset="100%" stopColor={META_BLUE} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={gradB} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={META_GREEN} stopOpacity={0.28} />
              <stop offset="100%" stopColor={META_GREEN} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`metaDailyImp-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9B8EFF" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#9B8EFF" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          {chartMode === 'cliques_impressoes' || chartMode === 'alcance_leads' ? (
            <>
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 9, fill: '#888', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 9, fill: '#888', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
            </>
          ) : (
            <YAxis tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
          )}
          <Tooltip content={<MetaDailyChartTooltip />} />
          {chartMode === 'cliques_impressoes' && (
            <>
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="cliques"
                name="Cliques"
                stroke={META_BLUE}
                strokeWidth={2}
                fill={`url(#${gradA})`}
                dot={false}
                activeDot={{ r: 3, fill: META_BLUE, strokeWidth: 0 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="impressoes"
                name="Impressões"
                stroke="#9B8EFF"
                strokeWidth={2}
                fill={`url(#metaDailyImp-${gid})`}
                dot={false}
                activeDot={{ r: 3, fill: '#9B8EFF', strokeWidth: 0 }}
              />
            </>
          )}
          {chartMode === 'gasto' && (
            <Area
              type="monotone"
              dataKey="gasto"
              name="Investimento"
              stroke={META_BLUE}
              strokeWidth={2}
              fill={`url(#${gradA})`}
              dot={false}
              activeDot={{ r: 3, fill: META_BLUE, strokeWidth: 0 }}
            />
          )}
          {chartMode === 'alcance_leads' && (
            <>
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="alcance"
                name="Alcance"
                stroke={META_BLUE}
                strokeWidth={2}
                fill={`url(#${gradA})`}
                dot={false}
                activeDot={{ r: 3, fill: META_BLUE, strokeWidth: 0 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke={META_GREEN}
                strokeWidth={2}
                fill={`url(#${gradB})`}
                dot={false}
                activeDot={{ r: 3, fill: META_GREEN, strokeWidth: 0 }}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )

  if (embedded) {
    return (
      <div className="meta-analysis-cell flex min-h-0 flex-col">
        <div className="mb-2 flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[11px] font-medium text-foreground font-sans">Desempenho diário</span>
            <p className="text-[9px] text-muted-foreground font-sans">{modeLabel}</p>
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
                    {META_CHART_MODES.map((mode) => (
                      <label key={mode.id} className="flex cursor-pointer items-center gap-2 text-[11px] text-foreground">
                        <input
                          type="checkbox"
                          checked={visibleModes.includes(mode.id)}
                          onChange={() => onToggleModeVisibility(mode.id)}
                          className="h-3.5 w-3.5 rounded border-white/20 bg-transparent"
                        />
                        <span>{mode.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {loading ? <p className="mb-1 text-[9px] text-muted-foreground">Carregando…</p> : null}
        <div className="mt-1 shrink-0">{chartBody}</div>
      </div>
    )
  }

  return chartBody
}

function MetaFunnelBlock({ embedded = false }) {
  const { loading, data } = usePlatformOverview()
  const totals = useMemo(() => sumMetaDailyTotals(data?.daily), [data?.daily])
  const funnelStages = useMemo(() => buildMetaFunnelStages(totals), [totals])
  const funnelMax = funnelStages[0]?.value ?? 0
  const accountEmpty = !loading && funnelMax <= 0
  const showFunnelChart = funnelStages.length > 0 && funnelMax > 0

  const funnelBody = (
    <div className={cn('w-full shrink-0', embedded ? 'h-[112px]' : 'min-h-0 flex-1')}>
      {showFunnelChart ? (
        <FunnelChart
          data={funnelStages}
          orientation="horizontal"
          color={META_BLUE}
          layers={3}
          staggerDelay={0.1}
          gap={4}
          showLabels
          showValues
          showPercentage
          percentMode="step"
          formatPercentage={funnelPercentLabel}
          edges="curved"
          className="h-full w-full"
          style={embedded ? undefined : { aspectRatio: '2.2/1' }}
        />
      ) : accountEmpty ? (
        <p className="text-[10px] text-muted-foreground">Sem totais no período para este funil.</p>
      ) : null}
    </div>
  )

  if (embedded) {
    return (
      <div className="meta-analysis-cell flex min-h-0 flex-col border-l border-white/[0.06] lg:border-l">
        <div className="mb-2 flex shrink-0 flex-col gap-1.5">
          <span className="text-[11px] font-medium text-foreground font-sans">Funil</span>
          <p className="text-[9px] text-muted-foreground font-sans">Impressão → Clique → Leads</p>
        </div>
        {loading ? <p className="text-[9px] text-muted-foreground">Carregando…</p> : funnelBody}
      </div>
    )
  }

  return funnelBody
}

export function MetaPlacementsBlock() {
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
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-white/[0.06] bg-surface-card/95 p-4">
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
            <PieResponsiveContainer width="100%" height="100%">
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
                <RechartsPieTooltip
                  formatter={(v) => `${v}%`}
                  contentStyle={{ background: '#1E1E1E', border: '1px solid #2C2C2C', borderRadius: 8, fontSize: 11 }}
                />
              </PieChart>
            </PieResponsiveContainer>
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

export default function MetaAnalysisPanel() {
  return (
    <div className="google-analysis-panel-v2">
      <div className="google-analysis-row-main">
        <MetaDailyChart embedded />
        <MetaFunnelBlock embedded />
      </div>
    </div>
  )
}
