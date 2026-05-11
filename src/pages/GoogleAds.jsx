import { useMemo, useState } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, TrendingUp, TrendingDown, Eye, MousePointer, DollarSign, Target, Award } from 'lucide-react'
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

const EMPTY_GOOGLE_CHART = [{ dia: '—', cliques: 0, impressoes: 0, conversoes: 0, ctr: 0 }]

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
    const conversoes = Math.round(Number(d.conversions) || 0)
    const ctr = impressoes > 0 ? (cliques / impressoes) * 100 : 0
    return {
      dia,
      cliques,
      impressoes,
      conversoes,
      ctr: Math.round(ctr * 100) / 100,
    }
  })
}

const qualityData = [
  { keyword: 'consultoria fin.', score: 8, posicao: 1.2 },
  { keyword: 'planejamento fin.', score: 9, posicao: 1.5 },
  { keyword: 'investimentos', score: 7, posicao: 2.1 },
  { keyword: 'gestão patrimônio', score: 6, posicao: 1.8 },
  { keyword: 'consultoria riqueza', score: 7, posicao: 2.3 },
]

const funnelGoogle = [
  { label: 'Impressões', value: 50000, displayValue: '50.000' },
  { label: 'Cliques', value: 1990, displayValue: '1.990' },
  { label: 'Landing Page', value: 1791, displayValue: '1.791' },
  { label: 'Início Form.', value: 45, displayValue: '45' },
  { label: 'Conversões', value: 11, displayValue: '11' },
]

const campaigns = [
  { name: 'Campanha_Search_Leads', tipo: 'Search', status: 'active', investimento: 680, impressoes: 28500, cliques: 1140, ctr: 4.0, cpc: 0.6, conversoes: 7, impressaoParcela: '72%' },
  { name: 'Campanha_Display_Retarget', tipo: 'Display', status: 'active', investimento: 320, impressoes: 15200, cliques: 608, ctr: 4.0, cpc: 0.53, conversoes: 3, impressaoParcela: '—' },
  { name: 'Campanha_Perf_Max', tipo: 'Perf. Max', status: 'active', investimento: 200, impressoes: 6300, cliques: 242, ctr: 3.84, cpc: 0.83, conversoes: 1, impressaoParcela: '65%' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-2 text-xs shadow-xl">
      <p className="font-sans text-muted-foreground mb-2">Dia {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-sans text-muted-foreground">{p.name}:</span>
          <span className="font-mono text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function GoogleKpiCard({ index }) {
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
      <span className="kpi-label block truncate">{label}</span>
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

function GoogleClicksChart() {
  const { loading, data } = usePlatformOverview()
  const chartData = useMemo(() => mapGoogleDailyToChart(data?.daily), [data?.daily])
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <span className="section-title mb-3 block shrink-0">Cliques & Impressões Diárias</span>
      {loading ? <p className="mb-1 text-[10px] text-muted-foreground">Carregando série…</p> : null}
      <div className="h-44 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="googleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4285F4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4285F4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="cliques"
              name="Cliques"
              stroke="#4285F4"
              strokeWidth={2}
              fill="url(#googleGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#4285F4', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function GoogleQuality() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Award size={13} className="text-brand" />
        <span className="section-title">Índice de Qualidade</span>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-auto">
        {qualityData.map((kw) => (
          <div key={kw.keyword} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans text-muted-foreground truncate">{kw.keyword}</span>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[10px] font-mono text-muted-foreground">#{kw.posicao}</span>
                <span
                  className={cn(
                    'font-mono text-xs font-semibold',
                    kw.score >= 8 ? 'text-green-400' : kw.score >= 6 ? 'text-yellow-400' : 'text-red-400'
                  )}
                >
                  {kw.score}/10
                </span>
              </div>
            </div>
            <div className="h-2 bg-surface-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${kw.score * 10}%`,
                  background: kw.score >= 8 ? '#4ade80' : kw.score >= 6 ? '#F5C518' : '#f87171',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoogleFunnelBlock() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <span className="section-title block mb-3 shrink-0">Funil de Conversão</span>
      <div className="flex-1 min-h-0">
        <FunnelChart
          data={funnelGoogle}
          orientation="horizontal"
          color="#4285F4"
          layers={4}
          staggerDelay={0.1}
          gap={6}
          showLabels
          showValues
          showPercentage
          edges="curved"
          className="w-full"
        />
      </div>
    </div>
  )
}

function GoogleCampaignsTable() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden min-w-0 h-full flex flex-col">
      <div className="px-4 py-4 border-b border-surface-border shrink-0">
        <span className="section-title">Campanhas</span>
      </div>
      <div className="overflow-x-auto flex-1 min-h-0">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b border-surface-border bg-surface-input">
              {['Campanha', 'Tipo', 'Investimento', 'Cliques', 'CTR', 'Conv.', 'Imp. Parcela'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-2 text-[10px] uppercase tracking-wider font-sans font-medium text-muted-foreground',
                    h === 'Campanha' ? 'text-left' : 'text-right'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.name} className="border-b border-surface-border/50 last:border-0 hover:bg-surface-hover/40 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', c.status === 'active' ? 'bg-green-400' : 'bg-yellow-400')} />
                    <span className="font-sans text-white truncate max-w-[150px]">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-[10px] font-mono text-muted-foreground">{c.tipo}</span>
                </td>
                <td className="px-4 py-4 text-right font-mono text-white">{formatCurrency(c.investimento)}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{formatNumber(c.cliques)}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{formatPercent(c.ctr)}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{c.conversoes}</td>
                <td className="px-4 py-4 text-right font-mono text-muted-foreground">{c.impressaoParcela}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
  render: () => <GoogleKpiCard index={i} />,
}))

const GOOGLE_DASHBOARD_BLOCKS = [
  ...KPI_BLOCKS,
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
    defaultRowSpan: 3,
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
    render: () => <GoogleCampaignsTable />,
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
