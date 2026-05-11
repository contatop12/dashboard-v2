import { useMemo, useState } from 'react'
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
  Video,
  Share2,
  Heart,
  MessageCircle,
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
import DashboardGrid from '@/components/DashboardGrid'
import SuperAdminAccountTitle from '@/components/SuperAdminAccountTitle'
import ChannelAccountPicker from '@/components/ChannelAccountPicker'
import WorkerSecretsAccountPicker, {
  readWorkerMetaQueryFromStorage,
} from '@/components/WorkerSecretsAccountPicker'
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'

/** Shell visual dos KPIs (ícones); valores vêm da API. */
const META_KPI_SHELL = [
  { label: 'Valor gasto', icon: DollarSign, accent: 'brand' },
  { label: 'Alcance', icon: Users, accent: 'brand' },
  { label: 'Impressões', icon: Eye, accent: 'purple' },
  { label: 'CPM', icon: DollarSign, accent: 'purple' },
  { label: 'CTR (link)', icon: MousePointer, accent: 'brand' },
  { label: 'CPC (link)', icon: Target, accent: 'brand' },
  { label: 'Frequência', icon: Eye, accent: 'purple' },
  { label: 'Leads', icon: Target, accent: 'brand' },
]

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

const videoMetrics = [
  { label: '25%', value: 12.99, color: '#F5C518' },
  { label: '50%', value: 7.61, color: '#9B8EFF' },
  { label: '75%', value: 5.36, color: '#4A9BFF' },
  { label: '100%', value: 2.8, color: '#FF6B6B' },
]

const engMetrics = [
  { label: 'Curtidas', value: 1842, icon: Heart, color: '#FF6B6B' },
  { label: 'Comentários', value: 234, icon: MessageCircle, color: '#9B8EFF' },
  { label: 'Compartilhamentos', value: 87, icon: Share2, color: '#4A9BFF' },
]

const META_CREATIVES_MOCK = [
  {
    name: 'Casa dos Sonhos — Leads SP',
    gradient: 'linear-gradient(145deg, #1a3a5c 0%, #0d1b2a 100%)',
    status: 'active',
    metrics: [
      { label: 'Leads (Form.)', value: '3', highlight: true },
      { label: 'Custo/Lead', value: 'R$97,14' },
      { label: 'Investimento', value: 'R$291,43' },
    ],
  },
  {
    name: 'Retargeting — Visitantes Q4',
    gradient: 'linear-gradient(145deg, #2d1b69 0%, #1a0f3c 100%)',
    status: 'active',
    metrics: [
      { label: 'Leads (Form.)', value: '2', highlight: true },
      { label: 'Custo/Lead', value: 'R$106,67' },
      { label: 'Investimento', value: 'R$213,33' },
    ],
  },
  {
    name: 'Lookalike — Top 20% Audiência',
    gradient: 'linear-gradient(145deg, #0f3d2b 0%, #061a12 100%)',
    status: 'active',
    metrics: [
      { label: 'Leads (Form.)', value: '1', highlight: true },
      { label: 'Custo/Lead', value: 'R$200,00' },
      { label: 'Investimento', value: 'R$200,00' },
    ],
  },
  {
    name: 'Brand Awareness — Vídeo',
    gradient: 'linear-gradient(145deg, #3d2b0a 0%, #1f1505 100%)',
    status: 'paused',
    metrics: [
      { label: 'Leads (Form.)', value: '0', highlight: false },
      { label: 'Custo/Lead', value: '—' },
      { label: 'Investimento', value: 'R$100,00' },
    ],
  },
  {
    name: 'Leads Novos — Fevereiro 25',
    gradient: 'linear-gradient(145deg, #1a2d3d 0%, #0a151f 100%)',
    status: 'active',
    metrics: [
      { label: 'Leads (Form.)', value: '2', highlight: true },
      { label: 'Custo/Lead', value: 'R$87,50' },
      { label: 'Investimento', value: 'R$175,00' },
    ],
  },
  {
    name: 'Captação — Imóveis Alto Padrão',
    gradient: 'linear-gradient(145deg, #3d1a1a 0%, #200d0d 100%)',
    status: 'active',
    metrics: [
      { label: 'Leads (Form.)', value: '3', highlight: true },
      { label: 'Custo/Lead', value: 'R$73,33' },
      { label: 'Investimento', value: 'R$220,00' },
    ],
  },
]

const campaigns = [
  { name: 'Leads_Prospeccao_SP', status: 'active', objetivo: 'Geração de Leads', gasto: 680, alcance: 14200, impressoes: 26400, cliques: 476, ctr: 1.8, cpm: 25.76, leads: 7, custoLead: 97.14 },
  { name: 'Retargeting_Visitantes', status: 'active', objetivo: 'Conversão', gasto: 320, alcance: 8900, impressoes: 15200, cliques: 274, ctr: 1.8, cpm: 21.05, leads: 3, custoLead: 106.67 },
  { name: 'Lookalike_TOP20', status: 'active', objetivo: 'Geração de Leads', gasto: 200, alcance: 5350, impressoes: 8400, cliques: 151, ctr: 1.8, cpm: 23.81, leads: 1, custoLead: 200.0 },
  { name: 'Brand_Awareness_Video', status: 'paused', objetivo: 'Reconhecimento', gasto: 100, alcance: 0, impressoes: 0, cliques: 0, ctr: 0, cpm: 0, leads: 0, custoLead: null },
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

function MetaVideoRetention() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0">
      <div className="flex items-center gap-2 mb-4">
        <Video size={13} className="text-brand" />
        <span className="section-title">Retenção de Vídeo</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {videoMetrics.map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-2">
            <div className="w-full h-2 bg-surface-border rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(m.value / 15) * 100}%`, background: m.color }} />
            </div>
            <span className="font-mono text-sm font-semibold text-white">{m.value}%</span>
            <span className="text-[10px] text-muted-foreground font-sans">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetaEngagement() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0">
      <span className="section-title block mb-4">Engajamento</span>
      <div className="grid grid-cols-3 gap-4">
        {engMetrics.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 p-4 rounded-lg"
            style={{ background: `${color}10`, border: `1px solid ${color}30` }}
          >
            <Icon size={16} style={{ color }} />
            <span className="font-mono text-base font-semibold text-white">{formatNumber(value)}</span>
            <span className="text-[10px] text-muted-foreground font-sans text-center">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function campaignRowMatchesFilters(c, f) {
  const camp = f.campanha
  if (camp && camp !== 'Todas') {
    const n = c.name.toLowerCase()
    const fl = camp.toLowerCase()
    if (fl.includes('leads') && !(n.includes('lead') || n.includes('prospeccao'))) return false
    if (fl.includes('retarget') && !n.includes('retarget')) return false
    if (fl.includes('brand') && !n.includes('brand')) return false
    if (!fl.includes('leads') && !fl.includes('retarget') && !fl.includes('brand')) {
      const tail = fl.replace(/^campanha_/, '').replace(/_/g, '')
      if (tail && !n.includes(tail)) return false
    }
  }
  const obj = f.objetivo
  if (obj && obj !== 'Todos') {
    if (c.objetivo !== obj && !(obj === 'Reconhecimento' && c.objetivo.startsWith('Reconhec'))) return false
  }
  return true
}

function MetaCampaignsTable() {
  const { dimensionFilters } = useDashboardFilters()
  const visible = useMemo(
    () => campaigns.filter((c) => campaignRowMatchesFilters(c, dimensionFilters)),
    [dimensionFilters]
  )

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden min-w-0 h-full flex flex-col">
      <div className="px-4 py-4 border-b border-surface-border flex items-center justify-between shrink-0">
        <span className="section-title">Campanhas Meta Ads</span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {visible.filter((c) => c.status === 'active').length} ativas · {visible.length} linhas
        </span>
      </div>
      <div className="overflow-x-auto flex-1 min-h-0">
        <table className="w-full text-xs min-w-[800px]">
          <thead>
            <tr className="border-b border-surface-border bg-surface-input">
              {['Campanha', 'Status', 'Objetivo', 'Gasto', 'Alcance', 'Impressões', 'CTR', 'CPM', 'Leads', 'Custo/Lead'].map((h) => (
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
            {visible.map((c) => (
              <tr key={c.name} className="border-b border-surface-border/50 last:border-0 hover:bg-surface-hover/40 transition-colors">
                <td className="px-4 py-4 font-sans text-white font-medium truncate max-w-[180px]">{c.name}</td>
                <td className="px-4 py-4 text-right">
                  <span
                    className={cn(
                      'text-[10px] font-mono px-2 py-0.5 rounded',
                      c.status === 'active' ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'
                    )}
                  >
                    {c.status === 'active' ? '● Ativo' : '● Pausado'}
                  </span>
                </td>
                <td className="px-4 py-4 text-right font-sans text-muted-foreground text-[11px]">{c.objetivo}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{formatCurrency(c.gasto)}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{c.alcance ? formatNumber(c.alcance) : '—'}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{c.impressoes ? formatNumber(c.impressoes) : '—'}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{c.ctr ? formatPercent(c.ctr) : '—'}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{c.cpm ? formatCurrency(c.cpm) : '—'}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{c.leads}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{c.custoLead ? formatCurrency(c.custoLead) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MetaCreativesCarouselBlock() {
  const { data } = usePlatformOverview()
  const cards = useMemo(() => {
    const c = data?.creatives
    if (Array.isArray(c)) return c
    return META_CREATIVES_MOCK
  }, [data?.creatives])

  const empty = Array.isArray(data?.creatives) && data.creatives.length === 0
  const activeCount = cards.filter((c) => c.status === 'active').length

  return (
    <CreativesCarousel
      title="Criativos — Meta Ads"
      badge={empty ? '0 no período' : `${activeCount} ativos`}
      cards={empty ? [] : cards}
      emptyMessage="Nenhum anúncio com gasto no período selecionado. Ajuste as datas ou verifique as campanhas."
    />
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
      id: 'meta-video',
      tier: 'secondary',
      defaultColSpan: 4,
      defaultRowSpan: 2,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 2,
      maxRowSpan: 8,
      render: () => <MetaVideoRetention />,
    },
    {
      id: 'meta-engagement',
      tier: 'secondary',
      defaultColSpan: 4,
      defaultRowSpan: 2,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 2,
      maxRowSpan: 8,
      render: () => <MetaEngagement />,
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
      render: () => <MetaCampaignsTable />,
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
