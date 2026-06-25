import { useMemo, useId } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Percent, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { cn, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'
import InstagramAnalysisPanel from '@/components/InstagramAnalysisPanel'
import { buildInstagramMetricsView, rawAggFromIgDaily } from '@/lib/instagramMetricsCompute'

const IG_HERO_KEYS = [
  { key: 'reach', label: 'Alcance', tone: 'google-amber', icon: Eye, higherIsBetter: true },
  { key: 'accountsEngaged', label: 'Contas engajadas', tone: 'google-green', icon: Users, higherIsBetter: true },
  { key: 'engagementRate', label: 'Taxa de engajamento', tone: 'google-purple', icon: Percent, higherIsBetter: true },
  { key: 'impressions', label: 'Impressões', tone: 'google-blue', icon: Eye, higherIsBetter: true },
]

const IG_SECONDARY = [
  { key: 'likes', label: 'Curtidas', higherIsBetter: true },
  { key: 'comments', label: 'Comentários', higherIsBetter: true },
  { key: 'saves', label: 'Salvamentos', higherIsBetter: true },
  { key: 'shares', label: 'Compartilhamentos', higherIsBetter: true },
]

const COMPACT_NUMBER = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const IG_PINK = '#E1306C'
const IG_PINK_COMPARE = '#F472B6'

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
  const rows = daily.map((d) => ({ date: d.date, value: Number(d[valueKey]) || 0 }))
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
              <linearGradient id={`ig-trend-${gid}`} x1="0" y1="0" x2="0" y2="1">
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
              fill={`url(#ig-trend-${gid})`}
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

function HeroMetric({ label, data, loading, showDelta, tone, icon: Icon, higherIsBetter }) {
  const value = loading ? '…' : (data?.value ?? '—')
  const deltaPct = showDelta ? data?.deltaPct : null
  return (
    <div className={cn('google-hero-metric', `google-hero-metric--${tone}`)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="google-hero-metric__icon" aria-hidden>
            <Icon size={14} strokeWidth={2} />
          </span>
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </span>
        </div>
        <DeltaBadge deltaPct={deltaPct} higherIsBetter={higherIsBetter} />
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
    </div>
  )
}

export default function InstagramMetricsPanel() {
  const period = useDashboardBlockPeriod()
  const { comparePrimaryKpi, compareDateRange, dateRange } = useDashboardFilters()
  const { loading, data } = usePlatformOverview()
  const isPrevious = period === 'previous'
  const followers = data?.profile?.followers ?? data?.igMetricsRaw?.followers ?? 0

  const daily = useMemo(
    () => (isPrevious ? data?.compareDaily : data?.daily) ?? [],
    [isPrevious, data?.compareDaily, data?.daily]
  )

  const metricsRaw = useMemo(() => {
    const fromApi = isPrevious ? data?.igMetricsCompareRaw : data?.igMetricsRaw
    if (fromApi) return fromApi
    return rawAggFromIgDaily(daily, followers)
  }, [isPrevious, data?.igMetricsCompareRaw, data?.igMetricsRaw, daily, followers])

  const view = useMemo(() => {
    const compareRaw = isPrevious
      ? null
      : data?.igMetricsCompareRaw ?? rawAggFromIgDaily(data?.compareDaily, followers)
    return buildInstagramMetricsView(metricsRaw, compareRaw, comparePrimaryKpi && !isPrevious)
  }, [metricsRaw, data?.igMetricsCompareRaw, data?.compareDaily, comparePrimaryKpi, isPrevious, followers])

  const showDeltas = comparePrimaryKpi && !isPrevious
  const rangeLabel = useMemo(() => {
    if (isPrevious) {
      return formatRangeLabel(data?.compareRange, compareDateRange.start, compareDateRange.end)
    }
    return formatRangeLabel(data?.primaryRange, dateRange.start, dateRange.end)
  }, [isPrevious, data?.compareRange, data?.primaryRange, compareDateRange, dateRange])

  const hasComparePayload =
    data?.igMetricsCompareRaw != null ||
    (Array.isArray(data?.compareDaily) &&
      data.compareDaily.some((d) => (Number(d.reach) || 0) + (Number(d.impressions) || 0) > 0))
  const apiError = typeof data?.error === 'string' && data.error.trim() ? data.error.trim() : null
  const permissionDenied = Boolean(data?.permissionDenied)
  const profile = data?.profile
  const trendColor = isPrevious ? IG_PINK_COMPARE : IG_PINK

  if (isPrevious && !loading && !hasComparePayload) {
    return (
      <div className="google-metrics-panel google-metrics-panel--compare rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-xs font-medium text-foreground">Sem dados para o período de comparação</p>
        <p className="mt-1 text-[11px] text-muted-foreground font-sans">
          Ative &quot;Comparar KPIs&quot; e selecione um intervalo anterior com dados disponíveis.
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
      {apiError ? (
        <p className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-100/95 font-sans">
          {apiError}
        </p>
      ) : null}
      {profile && !metricsRaw && !isPrevious ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-3">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Seguidores</span>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
              {formatNumber(profile.followers ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-3">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Seguindo</span>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
              {formatNumber(profile.following ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-3">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Publicações</span>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
              {formatNumber(profile.mediaCount ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-3">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Perfil</span>
            <p className="mt-1 truncate font-sans text-sm text-foreground">
              {profile.username ? `@${profile.username}` : '—'}
            </p>
          </div>
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pink-400/90">
            {isPrevious ? 'Período de comparação' : 'Visão geral'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground font-sans">
            {isPrevious
              ? 'Valores absolutos do intervalo selecionado para comparar com o período principal'
              : 'Performance orgânica do perfil Instagram no período selecionado'}
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
          <span className="rounded-md bg-pink-500/10 px-2 py-0.5 text-[10px] font-medium text-pink-400">
            Variação vs comparação
          </span>
        ) : (
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Referência (sem variação)
          </span>
        )}
      </div>

      {!permissionDenied && metricsRaw ? (
        <>
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {IG_HERO_KEYS.map(({ key, label, tone, icon, higherIsBetter }) => (
          <HeroMetric
            key={key}
            label={label}
            data={view.primary[key]}
            loading={loading}
            showDelta={showDeltas}
            tone={tone}
            icon={icon}
            higherIsBetter={higherIsBetter}
          />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {IG_SECONDARY.map(({ key, label, higherIsBetter }) => (
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
              title="Alcance diário"
              subtitle="Alcance médio por dia no período"
              daily={daily}
              valueKey="reach"
              color={trendColor}
              formatValue={(v) => formatNumber(Math.round(v))}
              formatAxis={(v) => COMPACT_NUMBER.format(Number(v) || 0)}
            />
            <DailyTrendCard
              title="Impressões diárias"
              subtitle="Impressões médias por dia"
              daily={daily}
              valueKey="impressions"
              color="#9B8EFF"
              formatValue={(v) => formatNumber(Math.round(v))}
              formatAxis={(v) => COMPACT_NUMBER.format(Number(v) || 0)}
            />
            <DailyTrendCard
              title="Interações diárias"
              subtitle="Curtidas, comentários, salvamentos e compartilhamentos"
              daily={daily}
              valueKey="interactions"
              color="#F5C518"
              formatValue={(v) => formatNumber(Math.round(v))}
              formatAxis={(v) => COMPACT_NUMBER.format(Number(v) || 0)}
            />
          </div>

          <div className="mb-4">
            <InstagramAnalysisPanel />
          </div>
        </>
      ) : null}
        </>
      ) : null}
    </div>
  )
}
