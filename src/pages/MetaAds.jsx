import { useMemo, useState, useEffect } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { buildPlatformOverviewUrl } from '@/lib/platformOverviewUrl'
import { PlatformOverviewProvider, usePlatformOverview } from '@/components/PlatformOverviewProvider'
import {
  Facebook,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  Users,
  Cog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
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
import FunnelGeral from '@/components/FunnelGeral'
import CreativesCarousel from '@/components/CreativesCarousel'
import MetaCreativesSettingsModal from '@/components/MetaCreativesSettingsModal'
import DashboardGrid from '@/components/DashboardGrid'
import SuperAdminAccountTitle from '@/components/SuperAdminAccountTitle'
import ChannelAccountPicker from '@/components/ChannelAccountPicker'
import WorkerSecretsAccountPicker, {
  readWorkerMetaQueryFromStorage,
} from '@/components/WorkerSecretsAccountPicker'
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'
import { META_PRIMARY_KPI_LABELS } from '@/lib/metaPrimaryKpiLabels'
import { MonthlyAccountResultsTable } from '@/components/MonthlyAccountResultsTable'
import {
  readMetaCreativesSort,
  writeMetaCreativesSort,
  readMetaCreativesMetricKeys,
  writeMetaCreativesMetricKeys,
} from '@/lib/metaCreativesPreferences'
import { CampaignTree } from '@/components/CampaignTree'
import { BlockCard } from '@/components/ui/BlockCard'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useCampaignStatusMutation } from '@/hooks/useCampaignStatusMutation'

const META_KPI_ICONS = [DollarSign, Users, Eye, DollarSign, MousePointer, Target, Eye, Target]
const META_KPI_ACCENT = ['brand', 'brand', 'purple', 'purple', 'brand', 'brand', 'purple', 'brand']

/** Shell visual dos KPIs (ícones); valores vêm da API. Labels alinhados a `metaPrimaryKpiLabels`. */
const META_KPI_SHELL = META_PRIMARY_KPI_LABELS.map((label, i) => ({
  label,
  icon: META_KPI_ICONS[i],
  accent: META_KPI_ACCENT[i],
}))

const PLACEMENT_COLORS = ['#F5C518', '#9B8EFF', '#4A9BFF', '#FF6B6B', '#22c55e', '#f97316']

const EMPTY_CHART = [{ dia: '—', gasto: 0, alcance: 0, leads: 0, impressoes: 0 }]

function mapMetaDailyToChart(daily) {
  if (!Array.isArray(daily) || daily.length === 0) return EMPTY_CHART
  return daily.map((d) => {
    let dia = d.date || '—'
    try {
      // date_start vem como YYYY-MM-DD (dia da conta); parseISO desloca para UTC e distorce o rótulo no BR
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

function MetaKpiCard({ index }) {
  const period = useDashboardBlockPeriod()
  const { comparePrimaryKpi } = useDashboardFilters()
  const { loading, data } = usePlatformOverview()
  const shell = META_KPI_SHELL[index] ?? META_KPI_SHELL[0]
  const rowP = data?.metrics?.[index]
  const rowC = data?.compareMetrics?.[index]
  const label = rowP?.label ?? shell.label
  const value = loading ? '…' : period === 'previous' ? (rowC?.value ?? '—') : (rowP?.value ?? '—')
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
          <span className="text-muted-foreground font-mono text-[10px]">—</span>
        ) : null}
        <span className="kpi-delta-note min-w-0 truncate">{deltaNote}</span>
      </div>
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
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <span className="section-title">Desempenho Diário</span>
        <div className="flex items-center gap-2">
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
                'text-[10px] px-2 py-1 rounded font-mono transition-all',
                activeChart === k ? 'bg-brand text-[#0F0F0F] font-semibold' : 'text-muted-foreground hover:text-white'
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <p className="text-[10px] text-muted-foreground">Carregando série…</p>
      ) : null}
      <div className="h-44 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4A90D9" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4A90D9" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={chartKey}
              name={chartName}
              stroke="#4A90D9"
              strokeWidth={2}
              fill="url(#metaGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#4A90D9', strokeWidth: 0 }}
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
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <span className="section-title mb-4 block shrink-0">Posicionamentos</span>
      {loading ? <p className="text-[10px] text-muted-foreground">Carregando…</p> : null}
      {!hasData && !loading ? (
        <p className="text-[10px] text-muted-foreground">Sem dados de plataforma no período.</p>
      ) : null}
      <div className="flex min-h-0 flex-1 items-center gap-2">
        <div className="h-28 w-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={48}
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
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {hasData
            ? placementRows.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                  <span className="flex-1 truncate font-sans text-[10px] text-muted-foreground">{p.name}</span>
                  <span className="font-mono text-[11px] text-white">{p.value}%</span>
                </div>
              ))
            : null}
        </div>
      </div>
    </div>
  )
}

function MetaCampaignsBlock() {
  const { activeOrgId } = useOrgWorkspace()
  const { loading, data } = usePlatformOverview()
  const { mutate } = useCampaignStatusMutation(activeOrgId)
  const [tree, setTree] = useState([])
  const [pendingToggle, setPendingToggle] = useState(null) // { level, id, name, nextStatus }

  useEffect(() => { setTree(Array.isArray(data?.tree) ? data.tree : []) }, [data?.tree])

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

  const state = loading ? 'loading' : data?.campaignsError ? 'error' : tree.length === 0 ? 'empty' : 'ready'
  const activeCount = tree.filter((c) => String(c.effectiveStatus).toUpperCase() === 'ACTIVE').length

  return (
    <BlockCard
      title="Campanhas Meta Ads"
      badge={`${activeCount} ativas · ${tree.length} campanhas`}
      state={state}
      emptyMessage="Nenhuma campanha no período."
      errorMessage={String(data?.campaignsError || '')}
      bodyClassName="overflow-auto"
    >
      <CampaignTree
        tree={tree}
        onToggleStatus={(node) => setPendingToggle(node)}
      />
      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(o) => { if (!o) setPendingToggle(null) }}
        title={pendingToggle?.nextStatus === 'PAUSED' ? 'Pausar campanha?' : 'Ativar campanha?'}
        description={`Isso afeta a entrega ao vivo de "${pendingToggle?.name ?? ''}".`}
        confirmLabel={pendingToggle?.nextStatus === 'PAUSED' ? 'Pausar' : 'Ativar'}
        destructive={pendingToggle?.nextStatus === 'PAUSED'}
        onConfirm={onConfirmToggle}
      />
    </BlockCard>
  )
}

function normaliseMetaCreativeRow(raw) {
  const spend = Number(raw?.spend) || 0
  const leads = Number(raw?.leads) || 0
  const impressions = Number(raw?.impressions) || 0
  const linkClicks = Number(raw?.linkClicks ?? raw?.clicks) || 0
  return { ...raw, spend, leads, impressions, linkClicks }
}

function buildCreativeMetricRow(metricKey, card) {
  const { spend, leads, impressions, linkClicks } = card
  const cpl = leads > 0 ? spend / leads : null
  const ctr = impressions > 0 ? (linkClicks / impressions) * 100 : null
  const highlight = metricKey === 'leads'
  switch (metricKey) {
    case 'leads':
      return { label: 'Leads (form.)', value: String(Math.round(leads)), highlight }
    case 'cpl':
      return { label: 'Custo/Lead', value: cpl != null ? formatCurrency(cpl) : '—', highlight: false }
    case 'spend':
      return { label: 'Investimento', value: formatCurrency(spend), highlight: false }
    case 'impressions':
      return { label: 'Impressões', value: formatNumber(impressions), highlight: false }
    case 'clicks':
      return { label: 'Cliques (link)', value: formatNumber(linkClicks), highlight: false }
    case 'ctr': {
      const ok = impressions > 0 && linkClicks >= 0 && !Number.isNaN(ctr)
      return { label: 'CTR (link)', value: ok ? formatPercent(ctr) : '—', highlight: false }
    }
    default:
      return { label: '—', value: '—', highlight: false }
  }
}

function compareMetaCreatives(a, b, sortId) {
  const nameA = String(a.name ?? '').toLowerCase()
  const nameB = String(b.name ?? '').toLowerCase()
  const cplA = a.leads > 0 ? a.spend / a.leads : null
  const cplB = b.leads > 0 ? b.spend / b.leads : null
  const ctrA = a.impressions > 0 ? (a.linkClicks / a.impressions) * 100 : 0
  const ctrB = b.impressions > 0 ? (b.linkClicks / b.impressions) * 100 : 0
  switch (sortId) {
    case 'spend_desc':
      return (b.spend || 0) - (a.spend || 0)
    case 'leads_desc':
      return (b.leads || 0) - (a.leads || 0)
    case 'cpl_asc': {
      const ca = cplA ?? Number.POSITIVE_INFINITY
      const cb = cplB ?? Number.POSITIVE_INFINITY
      if (ca !== cb) return ca - cb
      return (b.spend || 0) - (a.spend || 0)
    }
    case 'impressions_desc':
      return (b.impressions || 0) - (a.impressions || 0)
    case 'ctr_desc':
      return ctrB - ctrA
    case 'clicks_desc':
      return (b.linkClicks || 0) - (a.linkClicks || 0)
    case 'name_asc':
      return nameA.localeCompare(nameB, 'pt')
    default:
      return 0
  }
}

function MetaCreativesCarouselBlock() {
  const { data } = usePlatformOverview()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sortId, setSortId] = useState(() => readMetaCreativesSort())
  const [metricKeys, setMetricKeys] = useState(() => readMetaCreativesMetricKeys())

  const baseCards = useMemo(() => {
    const c = data?.creatives
    return Array.isArray(c) ? c.map(normaliseMetaCreativeRow) : []
  }, [data?.creatives])

  const empty = Array.isArray(data?.creatives) && data.creatives.length === 0
  const activeCount = baseCards.filter((c) => c.status === 'active').length

  const cards = useMemo(() => {
    if (empty) return []
    const sorted = [...baseCards].sort((a, b) => compareMetaCreatives(a, b, sortId))
    return sorted.map((card) => ({
      ...card,
      metrics: metricKeys.map((k) => buildCreativeMetricRow(k, card)),
    }))
  }, [baseCards, empty, sortId, metricKeys])

  const onSortIdChange = (id) => {
    setSortId(id)
    writeMetaCreativesSort(id)
  }

  const onMetricKeysChange = (keys) => {
    setMetricKeys(keys)
    writeMetaCreativesMetricKeys(keys)
  }

  return (
    <>
      <CreativesCarousel
        title="Criativos — Meta Ads"
        badge={empty ? '0 no período' : `${activeCount} ativos`}
        cards={cards}
        emptyMessage="Nenhum anúncio com gasto no período selecionado. Ajuste as datas ou verifique as campanhas."
        headerExtra={
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-hover hover:text-white"
            aria-label="Configurar criativos"
          >
            <Cog size={14} />
          </button>
        }
      />
      <MetaCreativesSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        sortId={sortId}
        onSortIdChange={onSortIdChange}
        metricKeys={metricKeys}
        onMetricKeysChange={onMetricKeysChange}
      />
    </>
  )
}

function buildMetaDefinitions(activeChart, setActiveChart) {
  const kpiBlocks = META_KPI_SHELL.map((_, i) => ({
    id: `meta-kpi-${i}`,
    tier: 'primary',
    defaultColSpan: 1,
    defaultRowSpan: 1,
    minColSpan: 1,
    maxColSpan: 4,
    minRowSpan: 1,
    maxRowSpan: 3,
    render: () => <MetaKpiCard index={i} />,
  }))

  return [
    ...kpiBlocks,
    {
      id: 'meta-daily',
      tier: 'secondary',
      defaultColSpan: 5,
      defaultRowSpan: 3,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 2,
      maxRowSpan: 8,
      render: () => <MetaDailyChart activeChart={activeChart} setActiveChart={setActiveChart} />,
    },
    {
      id: 'meta-placements',
      tier: 'secondary',
      defaultColSpan: 3,
      defaultRowSpan: 3,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 2,
      maxRowSpan: 8,
      render: () => <MetaPlacements />,
    },
    {
      id: 'meta-funnel',
      tier: 'secondary',
      defaultColSpan: 4,
      defaultRowSpan: 4,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 2,
      maxRowSpan: 10,
      render: () => <FunnelGeral />,
    },
    {
      id: 'meta-creatives',
      tier: 'secondary',
      defaultColSpan: 8,
      defaultRowSpan: 2,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 2,
      maxRowSpan: 8,
      render: () => <MetaCreativesCarouselBlock />,
    },
    {
      id: 'meta-campaigns',
      tier: 'secondary',
      defaultColSpan: 8,
      defaultRowSpan: 3,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 2,
      maxRowSpan: 10,
      render: () => <MetaCampaignsBlock />,
    },
    {
      id: 'meta-monthly-results',
      tier: 'secondary',
      defaultColSpan: 8,
      defaultRowSpan: 4,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 3,
      maxRowSpan: 12,
      render: () => <MonthlyAccountResultsTable platform="meta" />,
    },
  ]
}

function MetaAdsPageHeader({ workerPlatformQuery, onWorkerPlatformQueryChange, periodSubtitle }) {
  return (
    <header className="shrink-0 border-b border-surface-border bg-[#0F0F0F] px-4 py-4">
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-blue-600/30 bg-blue-600/15 px-4 py-2">
            <Facebook size={14} className="text-blue-500" />
            <span className="text-xs font-sans font-semibold text-blue-400">Meta Ads</span>
          </div>
          <span className="text-xs font-sans text-muted-foreground">{periodSubtitle}</span>
        </div>
        <SuperAdminAccountTitle
          endpoint="/api/admin/platform/meta-overview"
          emptyLabel="Nome da conta de anúncios"
          className="w-full min-w-0 text-left"
          workerPlatformQuery={workerPlatformQuery}
          syncOverviewDates
        />
        <WorkerSecretsAccountPicker
          provider="meta_ads"
          onWorkerQueryChange={onWorkerPlatformQueryChange}
        />
        <ChannelAccountPicker provider="meta_ads" className="shrink-0" />
      </div>
    </header>
  )
}

function MetaAdsInner({ workerPlatformQuery, onWorkerPlatformQueryChange, periodSubtitle, definitions }) {
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <MetaAdsPageHeader
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={onWorkerPlatformQueryChange}
        periodSubtitle={periodSubtitle}
      />
      <div className="min-h-0 flex-1">
        <DashboardGrid pageId="MetaAds" definitions={definitions} className="min-h-full" />
      </div>
    </div>
  )
}

export default function MetaAds() {
  const [activeChart, setActiveChart] = useState('gasto')
  const [workerPlatformQuery, setWorkerPlatformQuery] = useState(() =>
    typeof window !== 'undefined' ? readWorkerMetaQueryFromStorage() : ''
  )
  const { activeOrgId } = useOrgWorkspace()
  const { dateRange, compareDateRange, comparePrimaryKpi } = useDashboardFilters()
  const definitions = useMemo(() => buildMetaDefinitions(activeChart, setActiveChart), [activeChart])

  const overviewUrl = useMemo(
    () =>
      buildPlatformOverviewUrl('/api/admin/platform/meta-overview', {
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
      <MetaAdsInner
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={setWorkerPlatformQuery}
        periodSubtitle={periodSubtitle}
        definitions={definitions}
      />
    </PlatformOverviewProvider>
  )
}
