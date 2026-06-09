import { useEffect, useId, useMemo, useState } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { FunnelChart } from '@/components/FunnelChart'
import DashboardGrid from '@/components/DashboardGrid'
import SuperAdminAccountTitle from '@/components/SuperAdminAccountTitle'
import ChannelAccountPicker from '@/components/ChannelAccountPicker'
import WorkerSecretsAccountPicker, {
  readWorkerGoogleAdsQueryFromStorage,
} from '@/components/WorkerSecretsAccountPicker'
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { buildPlatformOverviewUrl } from '@/lib/platformOverviewUrl'
import { PlatformOverviewProvider, usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { GoogleAdsCampaignTypesTable } from '@/components/GoogleAdsCampaignTypesTable'
import { MonthlyAccountResultsTable } from '@/components/MonthlyAccountResultsTable'
import { GoogleAdsDemographicsBlock } from '@/components/GoogleAdsDemographicsBlock'
import { BlockCard } from '@/components/ui/BlockCard'
import { MetricInfo } from '@/components/ui/MetricInfo'

// ─── Google brand colors (intentional, not generic surfaces) ───────────────
const G_BLUE = '#4285F4'
const G_GREEN = '#34A853'

// ─── KPI shell + metric dictionary keys ───────────────────────────────────
const GOOGLE_KPI_SHELL = [
  { label: 'Investimento', icon: DollarSign, accent: 'brand' },
  { label: 'Impressões', icon: Eye, accent: 'purple' },
  { label: 'Cliques', icon: MousePointer, accent: 'brand' },
  { label: 'CTR', icon: Target, accent: 'brand' },
  { label: 'CPC Médio', icon: DollarSign, accent: 'purple' },
  { label: 'Conversões', icon: Target, accent: 'brand' },
  { label: 'Custo/Conv.', icon: DollarSign, accent: 'purple' },
  { label: 'Taxa de Conv.', icon: TrendingUp, accent: 'brand' },
]

const GOOGLE_KPI_KEYS = [
  'invest',
  'impressions',
  'clicks',
  'ctr',
  'cpcAvg',
  'conversions',
  'cpl',
  'conversionRate',
]

const GOOGLE_DAILY_CHART_LS = 'p12_google_ads_daily_chart_mode'

const GOOGLE_CHART_MODES = [
  { id: 'cliques_conversoes', label: 'Cliques e conversões' },
  { id: 'cliques_impressoes', label: 'Cliques e impressões' },
  { id: 'investimento', label: 'Investimento' },
  { id: 'custo_conversao', label: 'Custo / conversão' },
  { id: 'impressoes', label: 'Impressões' },
  { id: 'valor_conversao', label: 'Valor / conversão' },
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

const GOOGLE_FUNNEL_LS = 'p12_google_ads_funnel_preset'

const GOOGLE_FUNNEL_PRESETS = [
  { id: 'account_impr_clicks_conv', label: 'Conta: impressões → cliques → conversões' },
  { id: 'account_impr_clicks', label: 'Conta: impressões → cliques' },
  { id: 'account_clicks_conv', label: 'Conta: cliques → conversões' },
  { id: 'illustrative', label: 'Ilustrativo (jornada no site)' },
]

function readGoogleFunnelPreset() {
  try {
    const v = localStorage.getItem(GOOGLE_FUNNEL_LS)?.trim()
    if (v && GOOGLE_FUNNEL_PRESETS.some((p) => p.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'account_impr_clicks_conv'
}

const ILLUSTRATIVE_FUNNEL_STAGES = [
  { label: 'Impressões', value: 50000, displayValue: '50.000' },
  { label: 'Cliques', value: 1990, displayValue: '1.990' },
  { label: 'Landing Page', value: 1791, displayValue: '1.791' },
  { label: 'Início Form.', value: 45, displayValue: '45' },
  { label: 'Conversões', value: 11, displayValue: '11' },
]

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

function formatFunnelConversionsDisplay(n) {
  const x = Number(n) || 0
  return Math.abs(x % 1) < 0.001
    ? formatNumber(Math.round(x))
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(x)
}

function buildGoogleFunnelStages(presetId, totals) {
  const { impressions: i, clicks: c, conversions: conv } = totals
  const fi = Math.max(0, i)
  const fc = Math.max(0, c)
  const fconv = Math.max(0, conv)

  switch (presetId) {
    case 'account_impr_clicks_conv':
      return [
        { label: 'Impressões', value: fi, displayValue: formatNumber(Math.round(fi)) },
        { label: 'Cliques', value: fc, displayValue: formatNumber(Math.round(fc)) },
        { label: 'Conversões', value: fconv, displayValue: formatFunnelConversionsDisplay(fconv) },
      ]
    case 'account_impr_clicks':
      return [
        { label: 'Impressões', value: fi, displayValue: formatNumber(Math.round(fi)) },
        { label: 'Cliques', value: fc, displayValue: formatNumber(Math.round(fc)) },
      ]
    case 'account_clicks_conv':
      return [
        { label: 'Cliques', value: fc, displayValue: formatNumber(Math.round(fc)) },
        { label: 'Conversões', value: fconv, displayValue: formatFunnelConversionsDisplay(fconv) },
      ]
    case 'illustrative':
    default:
      return ILLUSTRATIVE_FUNNEL_STAGES.map((row) => ({ ...row }))
  }
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
      ctr: Math.round(ctr * 100) / 100,
    }
  })
}

function formatGoogleDailyTooltipValue(dataKey, value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  if (dataKey === 'gasto' || dataKey === 'custoPorConv' || dataKey === 'valorPorConv') return formatCurrency(n)
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

function GoogleKpiCard({ index, metricKey }) {
  const period = useDashboardBlockPeriod()
  const { comparePrimaryKpi } = useDashboardFilters()
  const { loading, data } = usePlatformOverview()
  const shell = GOOGLE_KPI_SHELL[index] ?? GOOGLE_KPI_SHELL[0]
  const rowP = data?.metrics?.[index]
  const rowC = data?.compareMetrics?.[index]
  const label = rowP?.label ?? shell.label
  const value =
    loading ? '…' : period === 'previous' ? (rowC?.value ?? '—') : (rowP?.value ?? '—')
  const deltaPct = period === 'current' && comparePrimaryKpi ? rowP?.deltaPct : null
  const hasDelta = deltaPct !== null && deltaPct !== undefined && !Number.isNaN(Number(deltaPct))
  const n = Number(deltaPct)
  const isPos = hasDelta && n > 0
  const isNeg = hasDelta && n < 0
  const deltaNote =
    period === 'previous' ? 'período de comparação' : comparePrimaryKpi ? 'vs período comp.' : 'ative comparação'
  return (
    <div className="kpi-card min-h-0 w-full shrink-0">
      <div className="flex items-center gap-1 min-w-0">
        <span className="kpi-label block truncate">{label}</span>
        {metricKey ? <MetricInfo metricKey={metricKey} size={11} /> : null}
      </div>
      <span className="kpi-value block truncate tabular-nums">{value}</span>
      <div className="kpi-delta-row min-w-0">
        {period === 'current' && hasDelta ? (
          <div
            className={cn(
              'inline-flex shrink-0 items-center gap-1',
              isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-muted-foreground'
            )}
          >
            {isPos ? <TrendingUp size={12} strokeWidth={2} /> : isNeg ? <TrendingDown size={12} strokeWidth={2} /> : null}
            <span>
              {n >= 0 ? '+' : ''}
              {n.toFixed(1)}%
            </span>
          </div>
        ) : period === 'current' ? (
          <span className="font-mono text-[10px] text-muted-foreground">—</span>
        ) : null}
        <span className="kpi-delta-note min-w-0 truncate">{deltaNote}</span>
      </div>
    </div>
  )
}

function formatConversionCell(conversions, value) {
  const hasFrac = Math.abs(conversions % 1) > 1e-6
  const convPart = hasFrac
    ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(conversions)
    : formatNumber(Math.round(conversions))
  if (value && Math.abs(value) >= 0.01) {
    return `${convPart} · ${formatCurrency(value)}`
  }
  return convPart
}

function formatConversionTotal(total) {
  const hasFrac = Math.abs(total % 1) > 1e-4
  return hasFrac
    ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)
    : formatNumber(Math.round(total))
}

function GoogleConversionPanel({ title, rows, loading }) {
  const total = rows.reduce((s, r) => s + (Number(r.conversions) || 0), 0)

  const scopeSelect = (
    <div className="relative shrink-0">
      <select
        disabled
        className="h-7 w-36 cursor-not-allowed appearance-none rounded border border-surface-border bg-surface-input py-1 pl-2 pr-7 text-[10px] text-muted-foreground font-sans"
        aria-label="Âmbito das conversões"
        defaultValue="all"
      >
        <option value="all">Todas as conv.</option>
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )

  return (
    <BlockCard
      title={title}
      actions={scopeSelect}
      state={loading ? 'loading' : 'ready'}
      bodyClassName="px-0 pb-0 flex flex-col"
    >
      <div className="flex max-h-[200px] min-h-[100px] flex-1 flex-col gap-0 overflow-y-auto px-3 py-3">
        {rows.length === 0 ? (
          <p className="text-[11px] text-muted-foreground font-sans">Sem conversões neste grupo no período.</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex items-baseline justify-between gap-2 border-b border-surface-border/50 py-1.5 last:border-0"
            >
              <span className="min-w-0 flex-1 text-[11px] font-sans leading-snug text-foreground">{r.name}</span>
              <span className="shrink-0 text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                {formatConversionCell(Number(r.conversions) || 0, Number(r.value) || 0)}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="shrink-0 border-t border-surface-border py-3">
        <p className="text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground font-sans">
          Total
        </p>
        <p className="text-center font-mono text-lg font-bold tabular-nums text-foreground">
          {formatConversionTotal(total)}
        </p>
      </div>
    </BlockCard>
  )
}

function GoogleConversionsSplit() {
  const { loading, data } = usePlatformOverview()
  const cd = data?.conversionBreakdown
  const primary = Array.isArray(cd?.primary) ? cd.primary : []
  const secondary = Array.isArray(cd?.secondary) ? cd.secondary : []
  const err = typeof cd?.error === 'string' ? cd.error : ''

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2 px-0.5">
        <span className="section-title">Conversões por tipo</span>
      </div>
      {err ? <p className="text-[10px] text-amber-200/90 font-sans">{err}</p> : null}
      <div className="grid min-h-0 w-full grid-cols-1 gap-4 md:grid-cols-2">
        <GoogleConversionPanel title="Conversões primárias" rows={primary} loading={loading} />
        <GoogleConversionPanel title="Conversões secundárias" rows={secondary} loading={loading} />
      </div>
    </div>
  )
}

function GoogleClicksChart() {
  const gid = useId().replace(/:/g, '')
  const gradA = `googleDailyA-${gid}`
  const gradB = `googleDailyB-${gid}`
  const gradC = `googleDailyCusto-${gid}`
  const { loading, data } = usePlatformOverview()
  const chartData = useMemo(() => mapGoogleDailyToChart(data?.daily), [data?.daily])
  const [chartMode, setChartMode] = useState(readGoogleChartMode)

  const modeLabel = GOOGLE_CHART_MODES.find((m) => m.id === chartMode)?.label ?? 'Série diária'

  const onChartModeChange = (e) => {
    const v = e.target.value
    setChartMode(v)
    try {
      localStorage.setItem(GOOGLE_DAILY_CHART_LS, v)
    } catch {
      /* ignore */
    }
  }

  const dual = chartMode === 'cliques_conversoes' || chartMode === 'cliques_impressoes'
  const margin = dual ? { top: 2, right: 18, left: -12, bottom: 0 } : { top: 2, right: 8, left: -20, bottom: 0 }

  const chartModeSelect = (
    <select
      value={chartMode}
      onChange={onChartModeChange}
      className="max-w-full rounded-md border border-surface-border bg-surface-input py-1.5 pl-2 pr-8 text-[10px] text-foreground font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      aria-label="Métrica do gráfico diário"
    >
      {GOOGLE_CHART_MODES.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  )

  return (
    <BlockCard
      title={modeLabel}
      actions={chartModeSelect}
      state={loading ? 'loading' : 'ready'}
      bodyClassName="px-4 pb-4 flex flex-col"
    >
      <div className="h-44 min-h-0 flex-1">
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
            {chartMode === 'impressoes' && (
              <Area
                type="monotone"
                dataKey="impressoes"
                name="Impressões"
                stroke="#9B8EFF"
                strokeWidth={2}
                fill={`url(#googleDailyImp-${gid})`}
                dot={false}
                activeDot={{ r: 3, fill: '#9B8EFF', strokeWidth: 0 }}
              />
            )}
            {chartMode === 'valor_conversao' && (
              <Area
                type="monotone"
                dataKey="valorPorConv"
                name="Valor / conversão"
                stroke="#22c55e"
                strokeWidth={2}
                fill={`url(#${gradB})`}
                dot={false}
                activeDot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </BlockCard>
  )
}

const QUALITY_SCORE_INFO =
  'Nota de 1 a 10: Quality Score do Google Ads (média ponderada pelas impressões no período). Indica relevância entre anúncio, palavra-chave e página de destino. Cliques, conversões e custo por conversão são as métricas agregadas da mesma palavra no intervalo de datas.'

const GOOGLE_QUALITY_PAGE_SIZE = 14

function formatKeywordConversions(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const x = Number(n)
  return Math.abs(x % 1) < 0.001
    ? formatNumber(Math.round(x))
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(x)
}

function GoogleQuality() {
  const { loading, data } = usePlatformOverview()
  const kq = data?.keywordQuality
  const items = Array.isArray(kq?.items) ? kq.items : []
  const kqError = typeof kq?.error === 'string' && kq.error.trim() ? kq.error.trim() : null
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [items])

  const totalPages = Math.max(1, Math.ceil(items.length / GOOGLE_QUALITY_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = items.slice(
    (safePage - 1) * GOOGLE_QUALITY_PAGE_SIZE,
    safePage * GOOGLE_QUALITY_PAGE_SIZE
  )

  const titleNode = (
    <div className="flex items-center gap-1.5">
      <Award size={13} className="text-brand shrink-0" />
      <span className="section-title">Índice de Qualidade</span>
    </div>
  )

  const paginationNode = !loading && items.length > GOOGLE_QUALITY_PAGE_SIZE ? (
    <div className="flex shrink-0 items-center justify-end gap-1 pt-1 border-t border-surface-border/80">
      <button
        type="button"
        disabled={safePage <= 1}
        className={cn(
          'p-1 rounded-md border border-transparent',
          safePage <= 1
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-input border-surface-border'
        )}
        aria-label="Página anterior"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-[10px] font-mono text-muted-foreground tabular-nums px-1">
        {safePage}/{totalPages}
      </span>
      <button
        type="button"
        disabled={safePage >= totalPages}
        className={cn(
          'p-1 rounded-md border border-transparent',
          safePage >= totalPages
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-input border-surface-border'
        )}
        aria-label="Próxima página"
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  ) : null

  return (
    <BlockCard
      title={titleNode}
      infoKey="qualityScore"
      state={loading ? 'loading' : 'ready'}
      bodyClassName="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-2"
    >
      {kqError ? (
        <p className="text-[10px] text-amber-400/90 font-sans leading-snug shrink-0">{kqError}</p>
      ) : null}
      <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
        {!loading && pageItems.length === 0 ? (
          <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
            Sem palavras-chave de pesquisa com dados no período. Contas com campanhas só em Performance Max podem
            trazer poucos ou nenhum resultado nesta lista.
          </p>
        ) : null}
        {!loading &&
          pageItems.map((kw) => {
            const score = kw.qualityScore != null ? Number(kw.qualityScore) : null
            const barPct = score != null && !Number.isNaN(score) ? Math.min(100, Math.max(0, score * 10)) : 0
            const barColor =
              score == null || Number.isNaN(score)
                ? '#64748b'
                : score >= 8
                  ? '#4ade80'
                  : score >= 6
                    ? '#F5C518'
                    : '#f87171'
            const cpc =
              kw.costPerConversion != null && kw.costPerConversion !== undefined
                ? formatCurrency(Number(kw.costPerConversion))
                : '—'
            return (
              <div key={kw.keyword} className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-sans text-muted-foreground truncate" title={kw.keyword}>
                    {kw.keyword}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[11px] font-semibold shrink-0 tabular-nums',
                      score == null || Number.isNaN(score)
                        ? 'text-muted-foreground'
                        : score >= 8
                          ? 'text-green-400'
                          : score >= 6
                            ? 'text-yellow-400'
                            : 'text-red-400'
                    )}
                  >
                    {score != null && !Number.isNaN(score) ? `${Math.round(score)}/10` : '—'}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${barPct}%`, background: barColor }} />
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0 text-[9px] font-mono text-muted-foreground tabular-nums leading-tight">
                  <span>Cliques {formatNumber(Math.round(Number(kw.clicks) || 0))}</span>
                  <span>Conv. {formatKeywordConversions(kw.conversions)}</span>
                  <span>Custo/conv. {cpc}</span>
                </div>
              </div>
            )
          })}
      </div>
      {paginationNode}
    </BlockCard>
  )
}

function GoogleFunnelBlock() {
  const { loading, data } = usePlatformOverview()
  const [funnelPreset, setFunnelPreset] = useState(readGoogleFunnelPreset)

  const totals = useMemo(() => sumGoogleDailyTotals(data?.daily), [data?.daily])
  const funnelStages = useMemo(
    () => buildGoogleFunnelStages(funnelPreset, totals),
    [funnelPreset, totals]
  )

  const presetLabel = GOOGLE_FUNNEL_PRESETS.find((p) => p.id === funnelPreset)?.label ?? 'Funil'
  const isAccountPreset = funnelPreset.startsWith('account_')
  const funnelMax = funnelStages[0]?.value ?? 0
  const accountEmpty = !loading && isAccountPreset && funnelMax <= 0
  const showFunnelChart =
    funnelStages.length > 0 && (funnelPreset === 'illustrative' || funnelMax > 0)

  const onFunnelPresetChange = (e) => {
    const v = e.target.value
    setFunnelPreset(v)
    try {
      localStorage.setItem(GOOGLE_FUNNEL_LS, v)
    } catch {
      /* ignore */
    }
  }

  const funnelSelect = (
    <select
      value={funnelPreset}
      onChange={onFunnelPresetChange}
      className="max-w-[min(100%,220px)] shrink-0 rounded-md border border-surface-border bg-surface-input py-1.5 pl-2 pr-8 text-[10px] text-foreground font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      aria-label="Métricas exibidas no funil"
    >
      {GOOGLE_FUNNEL_PRESETS.map((p) => (
        <option key={p.id} value={p.id}>
          {p.label}
        </option>
      ))}
    </select>
  )

  // Determine BlockCard state
  const blockState = loading && isAccountPreset ? 'loading' : accountEmpty ? 'empty' : 'ready'

  return (
    <BlockCard
      title="Funil de conversão"
      actions={funnelSelect}
      state={blockState}
      emptyMessage="Sem totais no período para este funil. Ajuste as datas ou escolha outro preset."
      bodyClassName="px-4 pb-4 flex flex-col"
    >
      <div className="flex-1 min-h-0">
        {showFunnelChart ? (
          <FunnelChart
            data={funnelStages}
            orientation="horizontal"
            color={G_BLUE}
            layers={funnelStages.length >= 4 ? 4 : 3}
            staggerDelay={0.1}
            gap={6}
            showLabels
            showValues
            showPercentage
            formatPercentage={funnelPercentLabel}
            edges="curved"
            className="w-full"
          />
        ) : null}
      </div>
    </BlockCard>
  )
}

const KPI_BLOCKS = GOOGLE_KPI_SHELL.map((_, i) => ({
  id: `google-kpi-${i}`,
  tier: 'primary',
  defaultColSpan: 1,
  defaultRowSpan: 1,
  minColSpan: 1,
  maxColSpan: 4,
  minRowSpan: 1,
  maxRowSpan: 3,
  render: () => <GoogleKpiCard index={i} metricKey={GOOGLE_KPI_KEYS[i]} />,
}))

const GOOGLE_DASHBOARD_BLOCKS = [
  ...KPI_BLOCKS,
  {
    id: 'google-conversions-split',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 2,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 6,
    render: () => <GoogleConversionsSplit />,
  },
  {
    id: 'google-clicks',
    tier: 'secondary',
    defaultColSpan: 5,
    defaultRowSpan: 3,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <GoogleClicksChart />,
  },
  {
    id: 'google-quality',
    tier: 'secondary',
    defaultColSpan: 3,
    defaultRowSpan: 5,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <GoogleQuality />,
  },
  {
    id: 'google-funnel',
    tier: 'secondary',
    defaultColSpan: 3,
    defaultRowSpan: 4,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 10,
    render: () => <GoogleFunnelBlock />,
  },
  {
    id: 'google-campaigns',
    tier: 'secondary',
    defaultColSpan: 5,
    defaultRowSpan: 4,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 10,
    render: () => <GoogleAdsCampaignTypesTable />,
  },
  {
    id: 'google-monthly-results',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 4,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 3,
    maxRowSpan: 12,
    render: () => <MonthlyAccountResultsTable platform="google" />,
  },
  {
    id: 'google-demographics',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 5,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 4,
    maxRowSpan: 12,
    render: () => <GoogleAdsDemographicsBlock />,
  },
]

function GoogleAdsPageHeader({ workerPlatformQuery, onWorkerPlatformQueryChange, periodSubtitle }) {
  return (
    <header className="shrink-0 border-b border-surface-border bg-[#0F0F0F] px-4 py-4">
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-[#4285F4]/30 bg-[#4285F4]/15 px-4 py-2">
            <Search size={14} className="text-[#4285F4]" />
            <span className="text-xs font-sans font-semibold text-[#4285F4]">Google Ads</span>
          </div>
          <span className="text-xs font-sans text-muted-foreground">{periodSubtitle}</span>
        </div>
        <SuperAdminAccountTitle
          endpoint="/api/admin/platform/google-ads-overview"
          emptyLabel="Nome da conta Google Ads"
          className="w-full min-w-0 text-left"
          workerPlatformQuery={workerPlatformQuery}
          syncOverviewDates
        />
        <WorkerSecretsAccountPicker
          provider="google_ads"
          onWorkerQueryChange={onWorkerPlatformQueryChange}
        />
        <ChannelAccountPicker provider="google_ads" className="shrink-0" />
      </div>
    </header>
  )
}

function GoogleAdsInner({ workerPlatformQuery, onWorkerPlatformQueryChange, periodSubtitle }) {
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <GoogleAdsPageHeader
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={onWorkerPlatformQueryChange}
        periodSubtitle={periodSubtitle}
      />
      <div className="min-h-0 flex-1">
        <DashboardGrid pageId="GoogleAds" definitions={GOOGLE_DASHBOARD_BLOCKS} className="min-h-full" />
      </div>
    </div>
  )
}

export default function GoogleAds() {
  const [workerPlatformQuery, setWorkerPlatformQuery] = useState(() =>
    typeof window !== 'undefined' ? readWorkerGoogleAdsQueryFromStorage() : ''
  )
  const { activeOrgId } = useOrgWorkspace()
  const { dateRange, compareDateRange, comparePrimaryKpi } = useDashboardFilters()

  const overviewUrl = useMemo(
    () =>
      buildPlatformOverviewUrl('/api/admin/platform/google-ads-overview', {
        orgId: activeOrgId,
        workerQuery: workerPlatformQuery,
        dateRange,
        compareDateRange,
        compareEnabled: comparePrimaryKpi,
      }),
    [activeOrgId, workerPlatformQuery, dateRange, compareDateRange, comparePrimaryKpi]
  )

  const periodSubtitle = useMemo(
    () =>
      `${format(dateRange.start, 'd MMM', { locale: ptBR })} – ${format(dateRange.end, 'd MMM yyyy', { locale: ptBR })} · período do filtro`,
    [dateRange.start, dateRange.end]
  )

  return (
    <PlatformOverviewProvider url={overviewUrl}>
      <GoogleAdsInner
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={setWorkerPlatformQuery}
        periodSubtitle={periodSubtitle}
      />
    </PlatformOverviewProvider>
  )
}
