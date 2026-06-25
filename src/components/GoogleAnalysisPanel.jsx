import { useEffect, useId, useMemo, useState } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Settings2 } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { FunnelChart } from '@/components/FunnelChart'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'
import { BlockCard } from '@/components/ui/BlockCard'

const G_BLUE = '#4285F4'
const G_GREEN = '#34A853'

const GOOGLE_DAILY_CHART_LS = 'p12_google_ads_daily_chart_mode'
const GOOGLE_DAILY_VISIBLE_MODES_LS = 'p12_google_ads_daily_visible_modes'

const GOOGLE_CHART_MODES = [
  { id: 'cliques_conversoes', label: 'Clique e conversões' },
  { id: 'cliques_impressoes', label: 'Cliques e impressões' },
  { id: 'investimento', label: 'Investimento' },
  { id: 'custo_conversao', label: 'Custo-Conversão' },
  { id: 'taxa_conversao', label: 'Taxa de Conversão' },
]

function readGoogleChartMode() {
  try {
    const v = localStorage.getItem(GOOGLE_DAILY_CHART_LS)?.trim()
    if (v && GOOGLE_CHART_MODES.some((m) => m.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'cliques_conversoes'
}

function readGoogleVisibleChartModes() {
  try {
    const raw = localStorage.getItem(GOOGLE_DAILY_VISIBLE_MODES_LS)
    if (!raw) return GOOGLE_CHART_MODES.map((m) => m.id)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return GOOGLE_CHART_MODES.map((m) => m.id)
    const allowed = new Set(GOOGLE_CHART_MODES.map((m) => m.id))
    const filtered = parsed.filter((id) => typeof id === 'string' && allowed.has(id))
    return filtered.length > 0 ? filtered : GOOGLE_CHART_MODES.map((m) => m.id)
  } catch {
    return GOOGLE_CHART_MODES.map((m) => m.id)
  }
}

function sumGoogleDailyTotals(daily) {
  if (!Array.isArray(daily)) {
    return { impressions: 0, clicks: 0, conversions: 0, spend: 0, conversionsValue: 0 }
  }
  return daily.reduce(
    (acc, d) => ({
      impressions: acc.impressions + Math.round(Number(d.impressions) || 0),
      clicks: acc.clicks + Math.round(Number(d.clicks) || 0),
      conversions: acc.conversions + (Number(d.conversions) || 0),
      spend: acc.spend + (Number(d.spend) || 0),
      conversionsValue: acc.conversionsValue + (Number(d.conversionsValue ?? d.conversions_value) || 0),
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0, conversionsValue: 0 }
  )
}

function sumBreakdownConversions(rows) {
  return Array.isArray(rows) ? rows.reduce((s, r) => s + (Number(r?.conversions) || 0), 0) : 0
}

function formatFunnelConversionsDisplay(n) {
  const x = Number(n) || 0
  return Math.abs(x % 1) < 0.001
    ? formatNumber(Math.round(x))
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(x)
}

function buildGoogleFunnelStages(totals, primaryConversions) {
  const { impressions: i, clicks: c, conversions: conv } = totals
  const fi = Math.max(0, i)
  const fc = Math.max(0, c)
  const fconv = Math.max(0, conv)
  const fconvPrimary = Math.max(0, primaryConversions)

  return [
    { label: 'Impressão', value: fi, displayValue: formatNumber(Math.round(fi)) },
    { label: 'Clique', value: fc, displayValue: formatNumber(Math.round(fc)) },
    { label: 'Total de Conversões', value: fconv, displayValue: formatFunnelConversionsDisplay(fconv) },
    { label: 'Conversões Primárias', value: fconvPrimary, displayValue: formatFunnelConversionsDisplay(fconvPrimary) },
  ]
}

function funnelPercentLabel(p) {
  if (p <= 0 || Number.isNaN(p)) return '0%'
  if (p < 0.05) return '<0,1%'
  if (p < 1) return `${p.toFixed(2).replace('.', ',')}%`
  if (p < 10) return `${p.toFixed(1).replace('.', ',')}%`
  return `${Math.round(p)}%`
}

const EMPTY_GOOGLE_CHART = [
  {
    dia: '—',
    cliques: 0,
    impressoes: 0,
    conversoes: 0,
    ctr: 0,
    gasto: 0,
    convValor: 0,
    custoPorConv: 0,
    valorPorConv: 0,
  },
]

function mapGoogleDailyToChart(daily) {
  if (!Array.isArray(daily) || daily.length === 0) return EMPTY_GOOGLE_CHART
  return daily.map((d) => {
    let dia = d.date || '—'
    try {
      if (d.date) dia = format(parse(d.date, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })
    } catch {
      /* ignore */
    }
    const impressoes = Math.round(Number(d.impressions) || 0)
    const cliques = Math.round(Number(d.clicks) || 0)
    const conversoes = Number(d.conversions) || 0
    const convValor = Number(d.conversionsValue ?? d.conversions_value) || 0
    const gasto = Number(d.spend) || 0
    const ctr = impressoes > 0 ? (cliques / impressoes) * 100 : 0
    const taxaConversao = cliques > 0 ? (conversoes / cliques) * 100 : 0
    const custoPorConv = conversoes > 0 ? gasto / conversoes : 0
    const valorPorConv = conversoes > 0 ? convValor / conversoes : 0
    return {
      dia,
      cliques,
      impressoes,
      conversoes,
      convValor,
      gasto,
      custoPorConv,
      valorPorConv,
      taxaConversao,
      ctr: Math.round(ctr * 100) / 100,
    }
  })
}

function formatGoogleDailyTooltipValue(dataKey, value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  if (dataKey === 'gasto' || dataKey === 'custoPorConv' || dataKey === 'valorPorConv') return formatCurrency(n)
  if (dataKey === 'taxaConversao') return `${n.toFixed(2)}%`
  if (dataKey === 'impressoes' || dataKey === 'cliques') return formatNumber(Math.round(n))
  if (dataKey === 'conversoes') {
    return Math.abs(n % 1) < 0.001
      ? formatNumber(Math.round(n))
      : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
  }
  return formatNumber(Math.round(n))
}

function GoogleDailyChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-2 text-xs shadow-xl">
      <p className="font-sans text-muted-foreground mb-2">Dia {label}</p>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-sans text-muted-foreground">{p.name}:</span>
          <span className="font-mono text-white font-semibold">
            {formatGoogleDailyTooltipValue(String(p.dataKey), p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function GoogleClicksChart({ embedded = false }) {
  const gid = useId().replace(/:/g, '')
  const gradA = `googleDailyA-${gid}`
  const gradB = `googleDailyB-${gid}`
  const gradC = `googleDailyCusto-${gid}`
  const period = useDashboardBlockPeriod()
  const isPrevious = period === 'previous'
  const { loading, data } = usePlatformOverview()
  const daily = isPrevious ? data?.compareDaily : data?.daily
  const chartData = useMemo(() => mapGoogleDailyToChart(daily), [daily])
  const [chartMode, setChartMode] = useState(readGoogleChartMode)
  const [visibleModes, setVisibleModes] = useState(readGoogleVisibleChartModes)
  const [showModePicker, setShowModePicker] = useState(false)

  const availableModes = useMemo(
    () => GOOGLE_CHART_MODES.filter((m) => visibleModes.includes(m.id)),
    [visibleModes]
  )

  useEffect(() => {
    if (!availableModes.some((m) => m.id === chartMode)) {
      const fallback = availableModes[0]?.id ?? GOOGLE_CHART_MODES[0].id
      setChartMode(fallback)
      try {
        localStorage.setItem(GOOGLE_DAILY_CHART_LS, fallback)
      } catch {
        /* ignore */
      }
    }
  }, [availableModes, chartMode])

  const modeLabel = GOOGLE_CHART_MODES.find((m) => m.id === chartMode)?.label ?? 'Série diária'

  const onChartModeChange = (modeId) => {
    setChartMode(modeId)
    try {
      localStorage.setItem(GOOGLE_DAILY_CHART_LS, modeId)
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
        localStorage.setItem(GOOGLE_DAILY_VISIBLE_MODES_LS, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const dual = chartMode === 'cliques_conversoes' || chartMode === 'cliques_impressoes'
  const margin = dual ? { top: 8, right: 12, left: -8, bottom: 0 } : { top: 8, right: 8, left: -16, bottom: 0 }

  const chartLegend = dual ? (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-sans text-muted-foreground">
      {chartMode === 'cliques_conversoes' ? (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#4285F4]" aria-hidden /> Cliques
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#34A853]" aria-hidden /> Conversões
          </span>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#4285F4]" aria-hidden /> Cliques
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#9B8EFF]" aria-hidden /> Impressões
          </span>
        </>
      )}
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-sans text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor:
              chartMode === 'investimento'
                ? G_BLUE
                : chartMode === 'custo_conversao'
                  ? '#f59e0b'
                  : '#a78bfa',
          }}
          aria-hidden
        />
        {modeLabel}
      </span>
    </div>
  )

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

  const chartBody = (
    <div className={cn('google-chart-canvas w-full shrink-0', embedded ? 'h-[140px]' : 'h-44')}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={margin}>
          <defs>
            <linearGradient id={gradA} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={G_BLUE} stopOpacity={0.25} />
              <stop offset="95%" stopColor={G_BLUE} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={gradB} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={G_GREEN} stopOpacity={0.22} />
              <stop offset="95%" stopColor={G_GREEN} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`googleDailyImp-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9B8EFF" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#9B8EFF" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={gradC} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
          {dual ? (
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
          <Tooltip content={<GoogleDailyChartTooltip />} />
          {chartMode === 'cliques_conversoes' && (
            <>
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="cliques"
                name="Cliques"
                stroke={G_BLUE}
                strokeWidth={2}
                fill={`url(#${gradA})`}
                dot={false}
                activeDot={{ r: 3, fill: G_BLUE, strokeWidth: 0 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="conversoes"
                name="Conversões"
                stroke={G_GREEN}
                strokeWidth={2}
                fill={`url(#${gradB})`}
                dot={false}
                activeDot={{ r: 3, fill: G_GREEN, strokeWidth: 0 }}
              />
            </>
          )}
          {chartMode === 'cliques_impressoes' && (
            <>
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="cliques"
                name="Cliques"
                stroke={G_BLUE}
                strokeWidth={2}
                fill={`url(#${gradA})`}
                dot={false}
                activeDot={{ r: 3, fill: G_BLUE, strokeWidth: 0 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="impressoes"
                name="Impressões"
                stroke="#9B8EFF"
                strokeWidth={2}
                fill={`url(#googleDailyImp-${gid})`}
                dot={false}
                activeDot={{ r: 3, fill: '#9B8EFF', strokeWidth: 0 }}
              />
            </>
          )}
          {chartMode === 'investimento' && (
            <Area
              type="monotone"
              dataKey="gasto"
              name="Investimento"
              stroke={G_BLUE}
              strokeWidth={2}
              fill={`url(#${gradA})`}
              dot={false}
              activeDot={{ r: 3, fill: G_BLUE, strokeWidth: 0 }}
            />
          )}
          {chartMode === 'custo_conversao' && (
            <Area
              type="monotone"
              dataKey="custoPorConv"
              name="Custo / conversão"
              stroke="#f59e0b"
              strokeWidth={2}
              fill={`url(#${gradC})`}
              dot={false}
              activeDot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
            />
          )}
          {chartMode === 'taxa_conversao' && (
            <Area
              type="monotone"
              dataKey="taxaConversao"
              name="Taxa de Conversão"
              stroke="#a78bfa"
              strokeWidth={2}
              fill={`url(#googleDailyImp-${gid})`}
              dot={false}
              activeDot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
            />
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
                    {GOOGLE_CHART_MODES.map((mode) => {
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
        {loading ? <p className="mb-1 text-[9px] text-muted-foreground">Carregando…</p> : null}
        <div className="mt-1 shrink-0">{chartBody}</div>
      </div>
    )
  }

  return (
    <BlockCard
      title="Desempenho diário"
      actions={chartModeTabs}
      state={loading ? 'loading' : 'ready'}
      bodyClassName="px-4 pb-4 flex flex-col gap-2"
    >
      {chartLegend}
      {chartBody}
    </BlockCard>
  )
}

function GoogleFunnelBlock({ embedded = false }) {
  const period = useDashboardBlockPeriod()
  const isPrevious = period === 'previous'
  const { loading, data } = usePlatformOverview()
  const daily = isPrevious ? data?.compareDaily : data?.daily
  const breakdown = isPrevious ? data?.compareConversionBreakdown : data?.conversionBreakdown

  const totals = useMemo(() => sumGoogleDailyTotals(daily), [daily])
  // Estágios de conversão vêm do breakdown (Primárias/Secundárias por rótulo do
  // Google = all_conversions), para o funil casar com o painel de conversões.
  // Total ≥ Primárias sempre; cai no total diário (lance) se o breakdown falhar.
  const primaryConversions = useMemo(() => sumBreakdownConversions(breakdown?.primary), [breakdown?.primary])
  const totalConversions = useMemo(
    () =>
      Math.max(
        primaryConversions + sumBreakdownConversions(breakdown?.secondary),
        totals.conversions
      ),
    [primaryConversions, breakdown?.secondary, totals.conversions]
  )
  const funnelStages = useMemo(
    () => buildGoogleFunnelStages({ ...totals, conversions: totalConversions }, primaryConversions),
    [totals, totalConversions, primaryConversions]
  )

  const funnelMax = funnelStages[0]?.value ?? 0
  const accountEmpty = !loading && funnelMax <= 0
  const showFunnelChart = funnelStages.length > 0 && funnelMax > 0
  const blockState = loading ? 'loading' : accountEmpty ? 'empty' : 'ready'

  const funnelBody = (
    <div className={cn('w-full shrink-0', embedded ? 'h-[112px]' : 'min-h-0 flex-1')}>
      {showFunnelChart ? (
        <FunnelChart
          data={funnelStages}
          orientation="horizontal"
          color={G_BLUE}
          layers={funnelStages.length >= 4 ? 4 : 3}
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
          <p className="text-[9px] text-muted-foreground font-sans">
            Impressão → Clique → Total de Conversões → Conversões Primárias
          </p>
        </div>
        {loading ? (
          <p className="text-[9px] text-muted-foreground">Carregando…</p>
        ) : (
          funnelBody
        )}
      </div>
    )
  }

  return (
    <BlockCard
      title="Funil de conversão"
      state={blockState}
      emptyMessage="Sem totais no período para este funil. Ajuste as datas ou escolha outro preset."
      bodyClassName="px-4 pb-4 flex flex-col"
    >
      {funnelBody}
    </BlockCard>
  )
}

export default function GoogleAnalysisPanel() {
  return (
    <div className="google-analysis-panel-v2">
      <div className="google-analysis-row-main">
        <GoogleClicksChart embedded />
        <GoogleFunnelBlock embedded />
      </div>
    </div>
  )
}
