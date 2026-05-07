import { useMemo, useState } from 'react'
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
import { useDashboardBlockPeriod } from '@/context/DashboardBlockPeriodContext'

const metaKPIs = [
  { label: 'Valor Gasto', value: 'R$1,30mil', delta: +12.4, icon: DollarSign, accent: 'brand' },
  { label: 'Alcance', value: '28.450', delta: +18.2, icon: Users, accent: 'brand' },
  { label: 'Impressões', value: '50.000', delta: +14.5, icon: Eye, accent: 'purple' },
  { label: 'CPM', value: 'R$26,00', delta: -5.1, icon: DollarSign, accent: 'purple' },
  { label: 'CTR (Link)', value: '1,80%', delta: +3.2, icon: MousePointer, accent: 'brand' },
  { label: 'CPC (Link)', value: 'R$1,44', delta: -8.3, icon: Target, accent: 'brand' },
  { label: 'Frequência', value: '1,76', delta: +2.1, icon: Eye, accent: 'purple' },
  { label: 'Leads', value: '11', delta: -9.1, icon: Target, accent: 'brand' },
]

const metaKPIsPrevious = [
  { label: 'Valor Gasto', value: 'R$1,12mil', delta: +4.2, icon: DollarSign, accent: 'brand' },
  { label: 'Alcance', value: '24.100', delta: +9.5, icon: Users, accent: 'brand' },
  { label: 'Impressões', value: '44.200', delta: +8.1, icon: Eye, accent: 'purple' },
  { label: 'CPM', value: 'R$27,20', delta: +2.4, icon: DollarSign, accent: 'purple' },
  { label: 'CTR (Link)', value: '1,65%', delta: -1.2, icon: MousePointer, accent: 'brand' },
  { label: 'CPC (Link)', value: 'R$1,58', delta: +4.1, icon: Target, accent: 'brand' },
  { label: 'Frequência', value: '1,68', delta: -0.8, icon: Eye, accent: 'purple' },
  { label: 'Leads', value: '9', delta: -5.0, icon: Target, accent: 'brand' },
]

const dailyData = [
  { dia: '01', gasto: 42, alcance: 920, leads: 0, impressoes: 1600 },
  { dia: '05', gasto: 65, alcance: 1450, leads: 1, impressoes: 2500 },
  { dia: '08', gasto: 38, alcance: 780, leads: 0, impressoes: 1300 },
  { dia: '10', gasto: 92, alcance: 2100, leads: 2, impressoes: 3800 },
  { dia: '12', gasto: 55, alcance: 1200, leads: 1, impressoes: 2100 },
  { dia: '15', gasto: 120, alcance: 2800, leads: 3, impressoes: 4900 },
  { dia: '17', gasto: 78, alcance: 1750, leads: 1, impressoes: 3100 },
  { dia: '19', gasto: 145, alcance: 3200, leads: 2, impressoes: 5600 },
  { dia: '22', gasto: 98, alcance: 2200, leads: 1, impressoes: 3900 },
  { dia: '24', gasto: 62, alcance: 1380, leads: 0, impressoes: 2400 },
  { dia: '26', gasto: 110, alcance: 2500, leads: 1, impressoes: 4200 },
  { dia: '28', gasto: 85, alcance: 1900, leads: 0, impressoes: 3300 },
  { dia: '31', gasto: 47, alcance: 1050, leads: 0, impressoes: 1900 },
]

const placements = [
  { name: 'Feed', value: 45, color: '#F5C518' },
  { name: 'Stories', value: 28, color: '#9B8EFF' },
  { name: 'Reels', value: 18, color: '#4A9BFF' },
  { name: 'Audience Net.', value: 9, color: '#FF6B6B' },
]

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

const metaCreatives = [
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
  const src = period === 'previous' ? metaKPIsPrevious : metaKPIs
  const { label, value, delta, icon: Icon, accent } = src[index] ?? metaKPIs[index]
  const isPos = delta > 0
  const deltaSuffix = period === 'previous' ? ' período ant.' : ' mês ant.'
  return (
    <div className="kpi-card flex min-h-0 w-full shrink-0 flex-col">
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span className="kpi-label truncate">{label}</span>
        <div
          className={cn(
            'w-6 h-6 shrink-0 rounded-md flex items-center justify-center',
            accent === 'brand' ? 'bg-brand/15' : 'bg-purple-accent/15'
          )}
        >
          <Icon size={12} className={accent === 'brand' ? 'text-brand' : 'text-accent-purple'} />
        </div>
      </div>
      <span className="kpi-value mt-1 tabular-nums truncate">{value}</span>
      <div className={cn('flex items-center gap-1 text-[10px] font-mono mt-1', isPos ? 'text-green-400' : 'text-red-400')}>
        {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {isPos ? '+' : ''}
        {delta}% vs{deltaSuffix}
      </div>
    </div>
  )
}

function MetaDailyChart({ activeChart, setActiveChart }) {
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
      <div className="h-44 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
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
              dataKey={activeChart}
              name={activeChart}
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
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <span className="section-title block mb-4 shrink-0">Posicionamentos</span>
      <div className="flex items-center gap-2 flex-1 min-h-0">
        <div className="w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={placements}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={48}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {placements.map((p, i) => (
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
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {placements.map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-[10px] font-sans text-muted-foreground flex-1 truncate">{p.name}</span>
              <span className="font-mono text-[11px] text-white">{p.value}%</span>
            </div>
          ))}
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

function MetaCampaignsTable() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden min-w-0 h-full flex flex-col">
      <div className="px-4 py-4 border-b border-surface-border flex items-center justify-between shrink-0">
        <span className="section-title">Campanhas Meta Ads</span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {campaigns.filter((c) => c.status === 'active').length} ativas
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
            {campaigns.map((c) => (
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

function buildMetaDefinitions(activeChart, setActiveChart) {
  const kpiBlocks = metaKPIs.map((_, i) => ({
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
      render: () => (
        <CreativesCarousel
          title="Criativos — Meta Ads"
          badge={`${metaCreatives.filter((c) => c.status === 'active').length} ativos`}
          cards={metaCreatives}
        />
      ),
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

function MetaAdsPageHeader() {
  return (
    <header className="shrink-0 border-b border-surface-border bg-[#0F0F0F] px-4 py-4">
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-blue-600/30 bg-blue-600/15 px-4 py-2">
            <Facebook size={14} className="text-blue-500" />
            <span className="text-xs font-sans font-semibold text-blue-400">Meta Ads</span>
          </div>
          <span className="text-xs font-sans text-muted-foreground">Janeiro 2025 • Todas as Campanhas</span>
        </div>
        <SuperAdminAccountTitle
          endpoint="/api/admin/platform/meta-overview"
          emptyLabel="Nome da conta de anúncios"
          className="w-full min-w-0 text-left"
        />
        <ChannelAccountPicker provider="meta_ads" className="shrink-0" />
      </div>
    </header>
  )
}

export default function MetaAds() {
  const [activeChart, setActiveChart] = useState('gasto')
  const definitions = useMemo(() => buildMetaDefinitions(activeChart, setActiveChart), [activeChart])

  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <MetaAdsPageHeader />
      <div className="min-h-0 flex-1">
        <DashboardGrid pageId="MetaAds" definitions={definitions} className="min-h-full" />
      </div>
    </div>
  )
}
