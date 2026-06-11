import { useEffect, useId, useMemo, useState } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { buildPlatformOverviewUrl } from '@/lib/platformOverviewUrl'
import { PlatformOverviewProvider, usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { GoogleAdsCampaignTypesTable } from '@/components/GoogleAdsCampaignTypesTable'
import { GoogleTopKeywordsTable } from '@/components/GoogleTopKeywordsTable'
import { GoogleKeywordPositionBlock } from '@/components/GoogleKeywordPositionBlock'
import { GoogleSearchTermsBlock } from '@/components/GoogleSearchTermsBlock'
import { MonthlyAccountResultsTable } from '@/components/MonthlyAccountResultsTable'
import { GoogleAdsDemographicsBlock } from '@/components/GoogleAdsDemographicsBlock'
import GoogleMetricsPanel from '@/components/GoogleMetricsPanel'
import GoogleConversionMixChart from '@/components/GoogleConversionMixChart'
import { BlockCard } from '@/components/ui/BlockCard'
import { CampaignTree } from '@/components/CampaignTree'
import { DimensionFilterSelect } from '@/components/ui/DimensionFilterSelect'
import { useCampaignStatusMutation } from '@/hooks/useCampaignStatusMutation'
import { filterOptionsFromTree, resolveTreeSlice } from '@/lib/filterOptionsFromTree'
import {
  GOOGLE_CAMPAIGN_STATUS_FILTER_OPTIONS,
  GOOGLE_CHANNEL_TYPE_LABELS,
} from '@/lib/googleAdsLabels'

// ─── Google brand colors (intentional, not generic surfaces) ───────────────
const G_BLUE = '#4285F4'
const G_GREEN = '#34A853'

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
    default:
      return [
        { label: 'Impressões', value: fi, displayValue: formatNumber(Math.round(fi)) },
        { label: 'Cliques', value: fc, displayValue: formatNumber(Math.round(fc)) },
        { label: 'Conversões', value: fconv, displayValue: formatFunnelConversionsDisplay(fconv) },
      ]
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

function GoogleConversionPanel({ title, rows, loading, accent = 'blue' }) {
  const total = rows.reduce((s, r) => s + (Number(r.conversions) || 0), 0)
  const maxConv = Math.max(...rows.map((r) => Number(r.conversions) || 0), 1)
  const barColor = accent === 'green' ? '#34A853' : '#4285F4'

  return (
    <div className="google-conv-card">
      <div className="google-conv-card__head">
        <h3 className="text-xs font-medium text-foreground font-sans">{title}</h3>
        {loading ? <span className="text-[10px] text-muted-foreground">Carregando…</span> : null}
      </div>
      <div className="google-conv-card__body">
        {rows.length === 0 ? (
          <p className="text-[11px] text-muted-foreground font-sans py-4 text-center">
            Sem conversões neste grupo no período.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r) => {
              const conv = Number(r.conversions) || 0
              const barPct = maxConv > 0 ? Math.min(100, (conv / maxConv) * 100) : 0
              const sharePct = total > 0 ? (conv / total) * 100 : 0
              return (
                <li key={r.id} className="min-w-0">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-[11px] font-sans text-foreground" title={r.name}>
                      {r.name}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
                      {formatConversionCell(conv, Number(r.value) || 0)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${barPct}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <span className="mt-0.5 block text-right font-mono text-[9px] tabular-nums text-muted-foreground">
                    {sharePct >= 0.05 ? `${sharePct.toFixed(0)}%` : '<1%'} do grupo
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="google-conv-card__foot">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total</span>
        <span className="font-mono text-xl font-bold tabular-nums text-foreground">{formatConversionTotal(total)}</span>
      </div>
    </div>
  )
}

function GoogleConversionsSplit() {
  const { loading, data } = usePlatformOverview()
  const cd = data?.conversionBreakdown
  const primary = Array.isArray(cd?.primary) ? cd.primary : []
  const secondary = Array.isArray(cd?.secondary) ? cd.secondary : []
  const err = typeof cd?.error === 'string' ? cd.error : ''

  return (
    <div className="google-conversions-section flex min-h-0 w-full min-w-0 flex-col gap-4">
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand/90">Conversões</span>
        <span className="text-xs text-muted-foreground font-sans">por tipo de ação</span>
      </div>
      {err ? <p className="text-[10px] text-amber-200/90 font-sans">{err}</p> : null}
      <div className="grid min-h-0 w-full grid-cols-1 gap-4 lg:grid-cols-3">
        <GoogleConversionPanel title="Primárias" rows={primary} loading={loading} accent="blue" />
        <GoogleConversionPanel title="Secundárias" rows={secondary} loading={loading} accent="green" />
        <GoogleConversionMixChart />
      </div>
    </div>
  )
}

function GoogleClicksChart({ embedded = false }) {
  const gid = useId().replace(/:/g, '')
  const gradA = `googleDailyA-${gid}`
  const gradB = `googleDailyB-${gid}`
  const gradC = `googleDailyCusto-${gid}`
  const { loading, data } = usePlatformOverview()
  const chartData = useMemo(() => mapGoogleDailyToChart(data?.daily), [data?.daily])
  const [chartMode, setChartMode] = useState(readGoogleChartMode)

  const modeLabel = GOOGLE_CHART_MODES.find((m) => m.id === chartMode)?.label ?? 'Série diária'

  const onChartModeChange = (modeId) => {
    setChartMode(modeId)
    try {
      localStorage.setItem(GOOGLE_DAILY_CHART_LS, modeId)
    } catch {
      /* ignore */
    }
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
                  : chartMode === 'impressoes'
                    ? '#9B8EFF'
                    : '#22c55e',
          }}
          aria-hidden
        />
        {modeLabel}
      </span>
    </div>
  )

  const chartModeTabs = (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-white/[0.06] bg-[#141414] p-1 [scrollbar-width:thin]">
      {GOOGLE_CHART_MODES.map((m) => (
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
  )

  if (embedded) {
    return (
      <div className="meta-analysis-cell flex min-h-0 flex-col">
        <div className="mb-2 flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[11px] font-medium text-foreground font-sans">Desempenho diário</span>
            <p className="text-[9px] text-muted-foreground font-sans">{modeLabel}</p>
          </div>
          {chartModeTabs}
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
    funnelStages.length > 0 && funnelMax > 0

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

  const blockState = loading && isAccountPreset ? 'loading' : accountEmpty ? 'empty' : 'ready'

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
          {funnelSelect}
        </div>
        {loading && isAccountPreset ? (
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
      actions={funnelSelect}
      state={blockState}
      emptyMessage="Sem totais no período para este funil. Ajuste as datas ou escolha outro preset."
      bodyClassName="px-4 pb-4 flex flex-col"
    >
      {funnelBody}
    </BlockCard>
  )
}

function GoogleAnalysisPanel() {
  return (
    <div className="google-analysis-panel-v2">
      <div className="google-analysis-row-main">
        <GoogleClicksChart embedded />
        <GoogleFunnelBlock embedded />
      </div>
    </div>
  )
}

const GOOGLE_TREE_LABELS = { adsets: 'Grupos de anúncios', ads: 'Anúncios', keywords: 'Palavras-chave' }

function GoogleCampaignsBlock({ workerPlatformQuery }) {
  const { activeOrgId } = useOrgWorkspace()
  const { loading, data } = usePlatformOverview()
  const { dimensionFilters, setFilterOptions } = useDashboardFilters()
  const [blockFilters, setBlockFilters] = useState({})
  const customerId = useMemo(() => {
    const m = /(?:^|&)customer_id=([^&]+)/.exec(workerPlatformQuery || '')
    return m ? decodeURIComponent(m[1]) : ''
  }, [workerPlatformQuery])
  const { mutate } = useCampaignStatusMutation(activeOrgId, {
    endpoint: '/api/admin/platform/google-campaign-status',
    extraBody: useMemo(() => (customerId ? { customerId } : {}), [customerId]),
  })
  const [tree, setTree] = useState([])
  const [pendingToggle, setPendingToggle] = useState(null) // { level, id, name, nextStatus }

  useEffect(() => { setTree(Array.isArray(data?.campaignTree) ? data.campaignTree : []) }, [data?.campaignTree])

  const allFilterOptions = useMemo(() => {
    if (!Array.isArray(data?.campaignTree)) return null
    return filterOptionsFromTree(data.campaignTree, {
      objectiveLabels: GOOGLE_CHANNEL_TYPE_LABELS,
      includeKeywords: true,
    })
  }, [data?.campaignTree])

  const treeFilterOptions = useMemo(
    () => ({
      campanha: allFilterOptions?.campanha ?? [],
      children: allFilterOptions?.children ?? [],
      objetivo: allFilterOptions?.objetivo ?? [],
    }),
    [allFilterOptions]
  )

  useEffect(() => {
    if (!allFilterOptions) return
    setFilterOptions({
      ads: allFilterOptions.ads,
      keywords: allFilterOptions.keywords,
      status: GOOGLE_CAMPAIGN_STATUS_FILTER_OPTIONS,
    })
  }, [allFilterOptions, setFilterOptions])

  useEffect(() => () => setFilterOptions({}), [setFilterOptions])

  const mergedFilters = useMemo(
    () => ({ ...dimensionFilters, ...blockFilters }),
    [dimensionFilters, blockFilters]
  )

  const visibleTree = useMemo(() => resolveTreeSlice(tree, mergedFilters), [tree, mergedFilters])

  const setBlockFilter = (key, opt) => setBlockFilters((prev) => ({ ...prev, [key]: opt }))
  const clearBlockFilter = (key) =>
    setBlockFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  const hasBlockFilters = Object.keys(blockFilters).length > 0

  const applyStatus = (node, status) => {
    const patch = (list) =>
      list.map((c) => ({
        ...c,
        effectiveStatus: c.id === node.id && node.level === 'campaign' ? status : c.effectiveStatus,
        adsets: (c.adsets || []).map((s) => ({
          ...s,
          effectiveStatus: s.id === node.id && node.level === 'adset' ? status : s.effectiveStatus,
          ads: (s.ads || []).map((a) => ({
            ...a,
            effectiveStatus: a.id === node.id && node.level === 'ad' ? status : a.effectiveStatus,
          })),
        })),
      }))
    setTree(patch)
  }

  const onConfirmToggle = async () => {
    const node = pendingToggle
    if (!node) return
    const prevStatus = node.nextStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    applyStatus(node, node.nextStatus) // optimistic
    const ok = await mutate(node)
    if (!ok) applyStatus(node, prevStatus) // rollback
  }

  const state = loading ? 'loading' : data?.campaignsError ? 'error' : visibleTree.length === 0 ? 'empty' : 'ready'
  const activeCount = visibleTree.filter((c) => String(c.effectiveStatus).toUpperCase() === 'ACTIVE').length

  return (
    <BlockCard
      title="Campanhas Google Ads"
      badge={`${activeCount} ativas · ${visibleTree.length} campanhas`}
      state={state}
      emptyMessage="Nenhuma campanha no período."
      errorMessage={String(data?.campaignsError || '')}
      bodyClassName="overflow-auto flex flex-col"
    >
      <div className="-mx-4 mb-3 flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 pb-3">
        <DimensionFilterSelect
          filterKey="objetivo"
          label="Tipo de campanha"
          value={blockFilters.objetivo || null}
          options={treeFilterOptions.objetivo}
          onChange={setBlockFilter}
          onClear={clearBlockFilter}
          compact
        />
        <DimensionFilterSelect
          filterKey="campanha"
          label="Campanha"
          value={blockFilters.campanha || null}
          options={treeFilterOptions.campanha}
          onChange={setBlockFilter}
          onClear={clearBlockFilter}
          compact
        />
        <DimensionFilterSelect
          filterKey="children"
          label="Grupo de anúncios"
          value={blockFilters.children || null}
          options={treeFilterOptions.children}
          onChange={setBlockFilter}
          onClear={clearBlockFilter}
          compact
        />
        {hasBlockFilters ? (
          <button
            type="button"
            onClick={() => setBlockFilters({})}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:text-white"
          >
            <span aria-hidden>×</span> Limpar
          </button>
        ) : null}
      </div>
      <CampaignTree
        tree={visibleTree}
        onToggleStatus={(node) => setPendingToggle(node)}
        labels={GOOGLE_TREE_LABELS}
        resultsLabel="Conversões"
        platform="google"
      />
      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(o) => { if (!o) setPendingToggle(null) }}
        title={pendingToggle?.nextStatus === 'PAUSED' ? 'Pausar no Google Ads?' : 'Ativar no Google Ads?'}
        description={`Isso afeta a entrega ao vivo de "${pendingToggle?.name ?? ''}".`}
        confirmLabel={pendingToggle?.nextStatus === 'PAUSED' ? 'Pausar' : 'Ativar'}
        destructive={pendingToggle?.nextStatus === 'PAUSED'}
        onConfirm={onConfirmToggle}
      />
    </BlockCard>
  )
}

const GOOGLE_DASHBOARD_BLOCKS = [
  {
    id: 'google-metrics',
    tier: 'primary',
    defaultColSpan: 8,
    defaultRowSpan: 4,
    minColSpan: 4,
    maxColSpan: 8,
    minRowSpan: 3,
    maxRowSpan: 6,
    render: () => <GoogleMetricsPanel />,
  },
  {
    id: 'google-conversions-split',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 3,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 6,
    render: () => <GoogleConversionsSplit />,
  },
  {
    id: 'google-analysis',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 4,
    minColSpan: 4,
    maxColSpan: 8,
    minRowSpan: 3,
    maxRowSpan: 6,
    render: () => <GoogleAnalysisPanel />,
  },
  {
    id: 'google-top-keywords',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 5,
    minColSpan: 4,
    maxColSpan: 8,
    minRowSpan: 3,
    maxRowSpan: 10,
    render: () => <GoogleTopKeywordsTable />,
  },
  {
    id: 'google-keyword-position',
    tier: 'secondary',
    defaultColSpan: 4,
    defaultRowSpan: 5,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 3,
    maxRowSpan: 10,
    render: () => <GoogleKeywordPositionBlock />,
  },
  {
    id: 'google-search-terms',
    tier: 'secondary',
    defaultColSpan: 4,
    defaultRowSpan: 5,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 3,
    maxRowSpan: 10,
    render: () => <GoogleSearchTermsBlock />,
  },
  {
    id: 'google-campaigns',
    tier: 'secondary',
    defaultColSpan: 8,
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

function GoogleAdsPageHeader({ workerPlatformQuery, onWorkerPlatformQueryChange }) {
  const { user } = useAuth()
  const { activeOrgId } = useOrgWorkspace()
  const secretsMode = user?.role === 'super_admin' && !activeOrgId

  return (
    <header className="shrink-0 border-b border-white/[0.06] py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4285F4]">
            Google Ads
          </span>
          {!secretsMode ? (
            <>
              <span className="text-white/20" aria-hidden>
                ·
              </span>
              <SuperAdminAccountTitle
                endpoint="/api/admin/platform/google-ads-overview"
                emptyLabel="Conta Google Ads"
                className="min-w-0 max-w-[min(100%,20rem)] text-left"
                size="sm"
                workerPlatformQuery={workerPlatformQuery}
                syncOverviewDates
              />
            </>
          ) : null}
        </div>
        <div className="flex min-w-[12rem] flex-1 flex-wrap items-center justify-end gap-2">
          <WorkerSecretsAccountPicker
            compact
            provider="google_ads"
            onWorkerQueryChange={onWorkerPlatformQueryChange}
          />
          <ChannelAccountPicker provider="google_ads" className="shrink-0" />
        </div>
      </div>
    </header>
  )
}

function GoogleAdsInner({ workerPlatformQuery, onWorkerPlatformQueryChange }) {
  const definitions = useMemo(() => {
    const treeBlock = {
      id: 'google-campaigns-tree',
      tier: 'secondary',
      defaultColSpan: 8,
      defaultRowSpan: 5,
      minColSpan: 4,
      maxColSpan: 8,
      minRowSpan: 3,
      maxRowSpan: 12,
      render: () => <GoogleCampaignsBlock workerPlatformQuery={workerPlatformQuery} />,
    }
    const [metrics, ...rest] = GOOGLE_DASHBOARD_BLOCKS
    return [metrics, treeBlock, ...rest]
  }, [workerPlatformQuery])

  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <GoogleAdsPageHeader
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={onWorkerPlatformQueryChange}
      />
      <div className="min-h-0 flex-1">
        <DashboardGrid definitions={definitions} className="min-h-full" />
      </div>
    </div>
  )
}

export default function GoogleAds() {
  const [workerPlatformQuery, setWorkerPlatformQuery] = useState(() =>
    typeof window !== 'undefined' ? readWorkerGoogleAdsQueryFromStorage() : ''
  )
  const { activeOrgId } = useOrgWorkspace()
  const { dateRange, compareDateRange, comparePrimaryKpi, dimensionFilters } = useDashboardFilters()

  // Traduz seleção do FilterBar em params do overview (anúncio restringe métricas da API).
  const apiFilters = useMemo(() => {
    const f = {}
    if (dimensionFilters.ads?.id) {
      const raw = String(dimensionFilters.ads.id)
      const sep = raw.indexOf('~')
      if (sep > 0) {
        f.adGroupId = raw.slice(0, sep)
        f.adId = raw.slice(sep + 1)
      } else {
        f.adId = raw
      }
    }
    return f
  }, [dimensionFilters])

  const overviewUrl = useMemo(
    () =>
      buildPlatformOverviewUrl('/api/admin/platform/google-ads-overview', {
        orgId: activeOrgId,
        workerQuery: workerPlatformQuery,
        dateRange,
        compareDateRange,
        compareEnabled: comparePrimaryKpi,
        filters: apiFilters,
      }),
    [activeOrgId, workerPlatformQuery, dateRange, compareDateRange, comparePrimaryKpi, apiFilters]
  )

  return (
    <PlatformOverviewProvider url={overviewUrl}>
      <GoogleAdsInner
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={setWorkerPlatformQuery}
      />
    </PlatformOverviewProvider>
  )
}
