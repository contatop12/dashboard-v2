import { useMemo, useId } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { MetricInfo } from '@/components/ui/MetricInfo'
import GeralAnalysisPanel from '@/components/GeralAnalysisPanel'
import GeralChannelSummary from '@/components/GeralChannelSummary'
import { buildGeralMetricCells, selectGeralDaily } from '@/lib/geralOverviewMetrics'

const COMPACT_NUMBER = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

const HERO_METRICS = [
  { id: 'investimento', label: 'Investimento', infoKey: 'invest', icon: Wallet, tone: 'google-blue', higherIsBetter: true },
  { id: 'resultado', label: 'Resultado', infoKey: 'results', icon: Target, tone: 'google-green', higherIsBetter: true },
  { id: 'custoResultado', label: 'Custo / Resultado', infoKey: 'cpl', icon: Wallet, tone: 'google-amber', higherIsBetter: false },
  { id: 'retorno', label: 'Retorno', infoKey: 'roas', icon: TrendingUp, tone: 'google-purple', higherIsBetter: true },
]

const SECONDARY_METRICS = [
  { id: 'impressoes', label: 'Impressões', infoKey: 'impressions', higherIsBetter: true },
  { id: 'cliques', label: 'Cliques', infoKey: 'clicks', higherIsBetter: true },
  { id: 'cpm', label: 'CPM', infoKey: 'cpm', higherIsBetter: false },
  { id: 'ctr', label: 'CTR', infoKey: 'ctr', higherIsBetter: true },
]

function formatDayLabel(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })
  } catch {
    return dateStr
  }
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
              <linearGradient id={`geral-trend-${gid}`} x1="0" y1="0" x2="0" y2="1">
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
              fill={`url(#geral-trend-${gid})`}
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

function HeroMetric({ label, infoKey, icon: Icon, tone, higherIsBetter, data }) {
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
          {infoKey ? <MetricInfo metricKey={infoKey} size={10} /> : null}
        </div>
        <DeltaBadge deltaPct={data?.deltaPct} higherIsBetter={higherIsBetter} />
      </div>
      <p className="google-hero-metric__value">{data?.value ?? '—'}</p>
    </div>
  )
}

function SecondaryMetric({ label, infoKey, higherIsBetter, data }) {
  return (
    <div className="google-secondary-metric">
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        {infoKey ? <MetricInfo metricKey={infoKey} size={9} /> : null}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{data?.value ?? '—'}</span>
        <DeltaBadge deltaPct={data?.deltaPct} higherIsBetter={higherIsBetter} />
      </div>
    </div>
  )
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

export default function GeralMetricsPanel() {
  const period = useDashboardBlockPeriod()
  const { comparePrimaryKpi, compareDateRange, dateRange } = useDashboardFilters()
  const { loading, data, error } = usePlatformOverview()
  const isPrevious = period === 'previous'
  const showDeltas = comparePrimaryKpi && !isPrevious

  const metrics = useMemo(
    () => buildGeralMetricCells(data, { isPrevious, compareEnabled: comparePrimaryKpi }),
    [data, isPrevious, comparePrimaryKpi]
  )

  const daily = useMemo(() => selectGeralDaily(data, isPrevious), [data, isPrevious])

  const rangeLabel = useMemo(() => {
    if (isPrevious) {
      return formatRangeLabel(data?.compareRange, compareDateRange.start, compareDateRange.end)
    }
    return formatRangeLabel(data?.primaryRange, dateRange.start, dateRange.end)
  }, [isPrevious, data?.compareRange, data?.primaryRange, compareDateRange, dateRange])

  const sourceHint = useMemo(() => {
    if (data?.source === 'worker_all') {
      const m = data?.metaAccountCount ?? 0
      const g = data?.googleAccountCount ?? 0
      return `Soma de ${m} conta(s) Meta e ${g} conta(s) Google no período`
    }
    if (data?.source === 'org') return 'Contas Meta e Google ligadas à organização ativa'
    return null
  }, [data?.source, data?.metaAccountCount, data?.googleAccountCount])

  const hasComparePayload = data?.compareTotals != null

  if (isPrevious && !comparePrimaryKpi) {
    return (
      <div className="google-metrics-panel google-metrics-panel--compare rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-xs font-medium text-foreground">Sem dados para o período de comparação</p>
        <p className="mt-1 text-[11px] text-muted-foreground font-sans">
          Ative &quot;Comparar KPIs&quot; no topo para ver o período anterior.
        </p>
      </div>
    )
  }

  if (isPrevious && !loading && comparePrimaryKpi && !hasComparePayload) {
    return (
      <div className="google-metrics-panel google-metrics-panel--compare rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-xs font-medium text-foreground">Sem dados para o período de comparação</p>
        <p className="mt-1 text-[11px] text-muted-foreground font-sans">
          Ajuste as datas em &quot;vs …&quot; no topo ou confira se havia entrega nesse intervalo.
        </p>
      </div>
    )
  }

  if (loading && !data?.configured) {
    return (
      <div className={cn('google-metrics-panel', isPrevious && 'google-metrics-panel--compare')}>
        <p className="text-xs text-muted-foreground">Carregando visão consolidada…</p>
      </div>
    )
  }

  if (!loading && !data?.configured) {
    return (
      <div className="google-metrics-panel rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-xs font-medium text-foreground">Visão consolidada indisponível</p>
        <p className="mt-1 text-[11px] text-muted-foreground font-sans">
          {data?.detail || error || 'Configure as credenciais Meta/Google ou selecione uma organização com contas conectadas.'}
        </p>
      </div>
    )
  }

  const apiErr =
    [data?.errors?.meta, data?.errors?.google].filter(Boolean).join(' · ') || error

  return (
    <div className={cn('google-metrics-panel', isPrevious && 'google-metrics-panel--compare')}>
      {apiErr ? (
        <p className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90 font-sans">
          {apiErr}
        </p>
      ) : null}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand/90">
            {isPrevious ? 'Período de comparação' : 'Visão consolidada'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground font-sans">
            {isPrevious
              ? 'Valores absolutos do intervalo selecionado para comparar com o período principal'
              : sourceHint ?? 'Meta Ads + Google Ads no período selecionado'}
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

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {HERO_METRICS.map((m) => (
          <HeroMetric key={m.id} {...m} data={metrics.hero[m.id]} />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SECONDARY_METRICS.map((m) => (
          <SecondaryMetric key={m.id} {...m} data={metrics.secondary[m.id]} />
        ))}
      </div>

      {!isPrevious ? (
        <>
          <GeralChannelSummary />

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DailyTrendCard
              title="Investimento diário"
              subtitle="Gasto médio por dia (todos os canais)"
              daily={daily}
              valueKey="spend"
              color="#F5C518"
              formatValue={(v) => formatCurrency(v)}
              formatAxis={(v) => `R$${COMPACT_NUMBER.format(Number(v) || 0)}`}
            />
            <DailyTrendCard
              title="Resultados diários"
              subtitle="Volume médio de resultados por dia"
              daily={daily}
              valueKey="results"
              color="#34A853"
              formatValue={(v) => formatNumber(Math.round(v))}
              formatAxis={(v) => COMPACT_NUMBER.format(Number(v) || 0)}
            />
            <DailyTrendCard
              title="Impressões diárias"
              subtitle="Alcance de mídia médio por dia"
              daily={daily}
              valueKey="impressions"
              color="#9B8EFF"
              formatValue={(v) => formatNumber(Math.round(v))}
              formatAxis={(v) => COMPACT_NUMBER.format(Number(v) || 0)}
            />
          </div>

          <div className="mb-2">
            <GeralAnalysisPanel />
          </div>
        </>
      ) : null}
    </div>
  )
}
