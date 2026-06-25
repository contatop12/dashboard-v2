import { useMemo, useState, useId } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronDown,
  ChevronUp,
  Percent,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'
import { Switch } from '@/components/ui/Switch'
import MetaAnalysisPanel from '@/components/MetaAnalysisPanel'
import {
  META_METRIC_DEFS,
  META_METRIC_TIER_LABEL,
  META_ADDABLE_METRICS,
  groupedConversionOptions,
} from '@/lib/metaMetricsConfig'
import {
  readMetaConversionType,
  writeMetaConversionType,
  readMetaMetricsVisibility,
  writeMetaMetricsVisibility,
  resetMetaMetricsVisibility,
} from '@/lib/metaMetricsPreferences'
import { buildMetaMetricsView, rawAggFromDaily } from '@/lib/metaMetricsCompute'

const META_HERO_KEYS = ['invest', 'conversions', 'costPerResult', 'conversionRate']
const META_SECONDARY_KEYS = [
  { key: 'impressions', label: 'Impressões', higherIsBetter: true },
  { key: 'linkClicks', label: 'Cliques', higherIsBetter: true },
  { key: 'cpcLink', label: 'CPC Médio', higherIsBetter: false },
  { key: 'ctrLink', label: 'CTR', higherIsBetter: true },
]

const META_HERO_STYLES = {
  invest: { tone: 'google-blue', icon: Wallet, higherIsBetter: true },
  conversions: { tone: 'google-green', icon: Target, higherIsBetter: true },
  costPerResult: { tone: 'google-amber', icon: Wallet, higherIsBetter: false },
  conversionRate: { tone: 'google-purple', icon: Percent, higherIsBetter: true },
}

const COMPACT_NUMBER = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

function formatDayLabel(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })
  } catch {
    return dateStr
  }
}

function formatRangeLabel(apiRange, fallbackStart, fallbackEnd) {
  if (apiRange?.since && apiRange?.until) {
    try {
      const s = parse(apiRange.since, 'yyyy-MM-dd', new Date())
      const u = parse(apiRange.until, 'yyyy-MM-dd', new Date())
      return `${format(s, 'd MMM', { locale: ptBR })} – ${format(u, 'd MMM yyyy', { locale: ptBR })}`
    } catch {
      /* fall through */
    }
  }
  if (fallbackStart && fallbackEnd) {
    return `${format(fallbackStart, 'd MMM', { locale: ptBR })} – ${format(fallbackEnd, 'd MMM yyyy', { locale: ptBR })}`
  }
  return null
}

function summarizeDailySeries(daily, valueKey) {
  if (!Array.isArray(daily) || daily.length === 0) return null
  const rows = daily.map((d) => ({
    date: d.date,
    value: Number(d[valueKey]) || 0,
  }))
  const total = rows.reduce((s, r) => s + r.value, 0)
  const avg = total / rows.length
  let peak = rows[0]
  let low = rows[0]
  for (const r of rows) {
    if (r.value > peak.value) peak = r
    if (r.value < low.value) low = r
  }
  return { avg, peak, low, count: rows.length }
}

function DailyTrendTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-sans text-muted-foreground">Dia {label}</p>
      <p className="font-mono font-semibold tabular-nums text-white">
        {formatValue(Number(payload[0]?.value) || 0)}
      </p>
    </div>
  )
}

function DailyTrendCard({ title, subtitle, daily, valueKey, formatValue, formatAxis, color }) {
  const gid = useId().replace(/:/g, '')
  const summary = useMemo(() => summarizeDailySeries(daily, valueKey), [daily, valueKey])
  const chartData = useMemo(() => {
    if (!Array.isArray(daily)) return []
    return daily.map((d) => ({
      dia: formatDayLabel(d.date),
      valor: Number(d[valueKey]) || 0,
    }))
  }, [daily, valueKey])

  if (!summary) {
    return (
      <div className="google-trend-card items-start justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
          <span className="text-[10px] text-muted-foreground/80 font-sans">{subtitle}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-sans">Sem dados no período.</span>
      </div>
    )
  }

  const { avg, peak, low, count } = summary

  return (
    <div className="google-trend-card">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
          <p className="font-mono text-xl font-bold tabular-nums text-foreground">{formatValue(avg)}</p>
          <span className="text-[10px] text-muted-foreground/85 font-sans">
            {subtitle} · {count} dias
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-[10px] font-sans text-muted-foreground">
          <span>
            Pico{' '}
            <strong className="font-mono font-medium text-foreground/90">{formatValue(peak.value)}</strong>
            {peak.date ? ` (${formatDayLabel(peak.date)})` : ''}
          </span>
          <span>
            Mín.{' '}
            <strong className="font-mono font-medium text-foreground/90">{formatValue(low.value)}</strong>
            {low.date ? ` (${formatDayLabel(low.date)})` : ''}
          </span>
        </div>
      </div>
      <div className="mt-2 h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`meta-trend-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
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
            <YAxis
              tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
              width={42}
              tickFormatter={formatAxis}
            />
            <Tooltip content={<DailyTrendTooltip formatValue={formatValue} />} />
            <Area
              type="monotone"
              dataKey="valor"
              stroke={color}
              strokeWidth={2}
              fill={`url(#meta-trend-${gid})`}
              dot={false}
              activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function DeltaBadge({ deltaPct, higherIsBetter = true }) {
  const hasDelta = deltaPct !== null && deltaPct !== undefined && !Number.isNaN(Number(deltaPct))
  if (!hasDelta) return null
  const n = Number(deltaPct)
  const isUp = n > 0
  const isDown = n < 0
  const isGood = higherIsBetter ? isUp : isDown
  const isBad = higherIsBetter ? isDown : isUp
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium',
        isGood && 'bg-emerald-500/15 text-emerald-400',
        isBad && 'bg-red-500/15 text-red-400',
        !isGood && !isBad && 'bg-white/5 text-muted-foreground'
      )}
    >
      {isUp ? <TrendingUp size={10} /> : isDown ? <TrendingDown size={10} /> : null}
      {n >= 0 ? '+' : ''}
      {n.toFixed(1)}%
    </span>
  )
}

function HeroMetric({ metricKey, label, data, loading, showDelta }) {
  const style = META_HERO_STYLES[metricKey] ?? META_HERO_STYLES.invest
  const Icon = style.icon
  const value = loading ? '…' : (data?.value ?? '—')
  const deltaPct = showDelta ? data?.deltaPct : null

  return (
    <div className={cn('google-hero-metric', `google-hero-metric--${style.tone}`)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="google-hero-metric__icon" aria-hidden>
            <Icon size={14} strokeWidth={2} />
          </span>
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </span>
        </div>
        <DeltaBadge deltaPct={deltaPct} higherIsBetter={style.higherIsBetter} />
      </div>
      <p className="google-hero-metric__value">{value}</p>
      {data?.hint ? <p className="mt-1 text-[10px] text-muted-foreground/80">{data.hint}</p> : null}
    </div>
  )
}

function SecondaryMetric({ label, data, loading, showDelta, higherIsBetter = true }) {
  const value = loading ? '…' : (data?.value ?? '—')
  const deltaPct = showDelta ? data?.deltaPct : null

  return (
    <div className="google-secondary-metric">
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{value}</span>
        <DeltaBadge deltaPct={deltaPct} higherIsBetter={higherIsBetter} />
      </div>
      {data?.hint ? <p className="mt-1 text-[10px] text-muted-foreground/75">{data.hint}</p> : null}
    </div>
  )
}

function CustomizePanel({ visibility, onChange, onReset }) {
  const tiers = ['primary', 'secondary', 'panel']

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#141414] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Exibir / ocultar métricas extras</span>
        <button type="button" onClick={onReset} className="text-[10px] text-brand hover:text-brand/80">
          Restaurar padrão
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {tiers.map((tier) => {
          const keys = Object.entries(META_METRIC_DEFS).filter(([, d]) => d.tier === tier)
          return (
            <div key={tier}>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {META_METRIC_TIER_LABEL[tier]}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {keys.map(([key, def]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-surface-card px-3 py-2.5"
                  >
                    <span className="text-[11px] text-foreground">{def.label}</span>
                    <Switch
                      size="sm"
                      checked={!!visibility[key]}
                      onCheckedChange={(on) => onChange({ ...visibility, [key]: on })}
                      aria-label={def.label}
                    />
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Adicionar métrica
        </p>
        <div className="flex flex-wrap gap-2">
          {META_ADDABLE_METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              disabled={!!visibility[m.key]}
              onClick={() => onChange({ ...visibility, [m.key]: true })}
              className="rounded-full border border-dashed border-white/15 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
            >
              + {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MetaMetricsPanel() {
  const period = useDashboardBlockPeriod()
  const { comparePrimaryKpi, compareDateRange, dateRange } = useDashboardFilters()
  const { loading, data } = usePlatformOverview()
  const isPrevious = period === 'previous'
  const [conversionId, setConversionId] = useState(readMetaConversionType)
  const [visibility, setVisibility] = useState(readMetaMetricsVisibility)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const daily = useMemo(
    () => (isPrevious ? data?.compareDaily : data?.daily) ?? [],
    [isPrevious, data?.compareDaily, data?.daily]
  )

  const metricsRaw = useMemo(() => {
    const fromApi = isPrevious ? data?.metaMetricsCompareRaw : data?.metaMetricsRaw
    if (fromApi) return fromApi
    return rawAggFromDaily(daily)
  }, [isPrevious, data?.metaMetricsCompareRaw, data?.metaMetricsRaw, daily])

  const view = useMemo(() => {
    const compareRaw = isPrevious ? null : data?.metaMetricsCompareRaw ?? rawAggFromDaily(data?.compareDaily)
    return buildMetaMetricsView(metricsRaw, compareRaw, conversionId, comparePrimaryKpi && !isPrevious)
  }, [metricsRaw, data?.metaMetricsCompareRaw, data?.compareDaily, conversionId, comparePrimaryKpi, isPrevious])

  const showDeltas = comparePrimaryKpi && !isPrevious
  const rangeLabel = useMemo(() => {
    if (isPrevious) {
      return formatRangeLabel(data?.compareRange, compareDateRange.start, compareDateRange.end)
    }
    return formatRangeLabel(data?.primaryRange, dateRange.start, dateRange.end)
  }, [isPrevious, data?.compareRange, data?.primaryRange, compareDateRange, dateRange])

  const hasComparePayload =
    data?.metaMetricsCompareRaw != null ||
    (Array.isArray(data?.compareDaily) && data.compareDaily.some((d) => (Number(d.spend) || 0) > 0))
  const apiError = typeof data?.error === 'string' && data.error.trim() ? data.error.trim() : null

  const onConversionChange = (id) => {
    setConversionId(id)
    writeMetaConversionType(id)
  }

  const onVisibilityChange = (next) => {
    setVisibility(next)
    writeMetaMetricsVisibility(next)
  }

  if (isPrevious && !loading && !hasComparePayload) {
    return (
      <div className="google-metrics-panel google-metrics-panel--compare rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-xs font-medium text-foreground">Sem dados para o período de comparação</p>
        <p className="mt-1 text-[11px] text-muted-foreground font-sans">
          Ajuste as datas em &quot;vs …&quot; no topo ou confira se a conta tinha entrega nesse intervalo.
        </p>
      </div>
    )
  }

  if (loading && !metricsRaw) {
    return (
      <div className={cn('google-metrics-panel', isPrevious && 'google-metrics-panel--compare')}>
        <p className="text-xs text-muted-foreground">Carregando métricas…</p>
      </div>
    )
  }

  return (
    <div className={cn('google-metrics-panel', isPrevious && 'google-metrics-panel--compare')}>
      {apiError && !metricsRaw ? (
        <p className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90 font-sans">
          {apiError}
        </p>
      ) : null}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400/90">
            {isPrevious ? 'Período de comparação' : 'Visão geral'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground font-sans">
            {isPrevious
              ? 'Valores absolutos do intervalo selecionado para comparar com o período principal'
              : 'Performance da conta Meta no período selecionado'}
          </p>
          {rangeLabel ? (
            <p className="mt-1 font-mono text-[10px] tabular-nums text-foreground/75">{rangeLabel}</p>
          ) : null}
        </div>
        {!isPrevious && !comparePrimaryKpi ? (
          <span className="text-[10px] text-muted-foreground/80 font-sans">
            Ative &quot;Comparar KPIs&quot; para variação vs período anterior
          </span>
        ) : !isPrevious ? (
          <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
            Variação vs comparação
          </span>
        ) : (
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Referência (sem variação)
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Tipo de resultado
          </span>
          <select
            value={conversionId}
            onChange={(e) => onConversionChange(e.target.value)}
            className="w-full max-w-md rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {groupedConversionOptions().map(({ group, options }) => (
              <optgroup key={group} label={group}>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setCustomizeOpen((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Personalizar métricas
          {customizeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {customizeOpen ? (
        <div className="mb-4">
          <CustomizePanel
            visibility={visibility}
            onChange={onVisibilityChange}
            onReset={() => onVisibilityChange(resetMetaMetricsVisibility())}
          />
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {META_HERO_KEYS.map((key) => (
          <HeroMetric
            key={key}
            metricKey={key}
            label={view.primary[key]?.label ?? META_METRIC_DEFS[key]?.label ?? key}
            data={view.primary[key]}
            loading={loading}
            showDelta={showDeltas}
          />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {META_SECONDARY_KEYS.map(({ key, label, higherIsBetter }) => (
          <SecondaryMetric
            key={key}
            label={label}
            data={view.secondary[key]}
            loading={loading}
            showDelta={showDeltas}
            higherIsBetter={higherIsBetter}
          />
        ))}
      </div>

      {!isPrevious ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DailyTrendCard
              title="Investimento diário"
              subtitle="Gasto médio por dia no período"
              daily={daily}
              valueKey="spend"
              color="#1877F2"
              formatValue={(v) => formatCurrency(v)}
              formatAxis={(v) => `R$${COMPACT_NUMBER.format(Number(v) || 0)}`}
            />
            <DailyTrendCard
              title="Cliques diários"
              subtitle="Volume médio de cliques por dia"
              daily={daily}
              valueKey="clicks"
              color="#34A853"
              formatValue={(v) => formatNumber(Math.round(v))}
              formatAxis={(v) => COMPACT_NUMBER.format(Number(v) || 0)}
            />
            <DailyTrendCard
              title="Alcance diário"
              subtitle="Alcance médio por dia no período"
              daily={daily}
              valueKey="reach"
              color="#F5C518"
              formatValue={(v) => formatNumber(Math.round(v))}
              formatAxis={(v) => COMPACT_NUMBER.format(Number(v) || 0)}
            />
          </div>

          <div className="mb-4">
            <MetaAnalysisPanel conversionId={conversionId} metricsRaw={metricsRaw} />
          </div>
        </>
      ) : null}
    </div>
  )
}
