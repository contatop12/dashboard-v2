import { Search, TrendingUp, TrendingDown, Eye, MousePointer, DollarSign, Target, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { FunnelChart } from '@/components/FunnelChart'
import DashboardGrid from '@/components/DashboardGrid'
import SuperAdminEnvLive from '@/components/SuperAdminEnvLive'

const googleKPIs = [
  { label: 'Investimento', value: 'R$1,30mil', delta: +12.4, icon: DollarSign, accent: 'brand' },
  { label: 'Impressões', value: '50.000', delta: +14.5, icon: Eye, accent: 'purple' },
  { label: 'Cliques', value: '1.990', delta: +9.2, icon: MousePointer, accent: 'brand' },
  { label: 'CTR', value: '3,98%', delta: +0.5, icon: Target, accent: 'brand' },
  { label: 'CPC Médio', value: 'R$0,65', delta: -3.1, icon: DollarSign, accent: 'purple' },
  { label: 'Conversões', value: '11', delta: -9.1, icon: Target, accent: 'brand' },
  { label: 'Custo/Conv.', value: 'R$118,18', delta: -5.4, icon: DollarSign, accent: 'purple' },
  { label: 'Taxa de Conv.', value: '0,55%', delta: +2.1, icon: TrendingUp, accent: 'brand' },
]

const dailyData = [
  { dia: '01', cliques: 48, impressoes: 1200, conversoes: 0, ctr: 4.0 },
  { dia: '05', cliques: 75, impressoes: 1900, conversoes: 1, ctr: 3.9 },
  { dia: '08', cliques: 42, impressoes: 1050, conversoes: 0, ctr: 4.0 },
  { dia: '10', cliques: 110, impressoes: 2750, conversoes: 2, ctr: 4.0 },
  { dia: '12', cliques: 68, impressoes: 1700, conversoes: 1, ctr: 4.0 },
  { dia: '15', cliques: 142, impressoes: 3550, conversoes: 3, ctr: 4.0 },
  { dia: '17', cliques: 92, impressoes: 2300, conversoes: 1, ctr: 4.0 },
  { dia: '19', cliques: 165, impressoes: 4125, conversoes: 1, ctr: 4.0 },
  { dia: '22', cliques: 118, impressoes: 2950, conversoes: 1, ctr: 4.0 },
  { dia: '24', cliques: 72, impressoes: 1800, conversoes: 0, ctr: 4.0 },
  { dia: '26', cliques: 128, impressoes: 3200, conversoes: 1, ctr: 4.0 },
  { dia: '28', cliques: 98, impressoes: 2450, conversoes: 0, ctr: 4.0 },
  { dia: '31', cliques: 55, impressoes: 1375, conversoes: 0, ctr: 4.0 },
]

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
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-sans text-muted-foreground mb-1.5">Dia {label}</p>
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

function GoogleKpiCard({ label, value, delta, icon: Icon, accent }) {
  const isPos = delta > 0
  return (
    <div className="kpi-card flex min-h-0 w-full shrink-0 flex-col">
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span className="kpi-label truncate">{label}</span>
        <div className={cn('w-6 h-6 shrink-0 rounded-md flex items-center justify-center', accent === 'brand' ? 'bg-brand/15' : 'bg-purple-accent/15')}>
          <Icon size={12} className={accent === 'brand' ? 'text-brand' : 'text-accent-purple'} />
        </div>
      </div>
      <span className="kpi-value mt-1 tabular-nums truncate">{value}</span>
      <div className={cn('flex items-center gap-0.5 text-[10px] font-mono mt-0.5', isPos ? 'text-green-400' : 'text-red-400')}>
        {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {isPos ? '+' : ''}
        {delta}%
      </div>
    </div>
  )
}

function GoogleClicksChart() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <span className="section-title block mb-3 shrink-0">Cliques & Impressões Diárias</span>
      <div className="h-44 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
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
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Award size={13} className="text-brand" />
        <span className="section-title">Índice de Qualidade</span>
      </div>
      <div className="flex flex-col gap-2.5 flex-1 min-h-0 overflow-auto">
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
            <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
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
      <div className="px-4 py-3 border-b border-surface-border shrink-0">
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
                    'px-3 py-2 text-[10px] uppercase tracking-wider font-sans font-medium text-muted-foreground',
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
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-1.5 h-1.5 rounded-full', c.status === 'active' ? 'bg-green-400' : 'bg-yellow-400')} />
                    <span className="font-sans text-white truncate max-w-[150px]">{c.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="text-[10px] font-mono text-muted-foreground">{c.tipo}</span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-white">{formatCurrency(c.investimento)}</td>
                <td className="px-3 py-3 text-right font-mono text-white">{formatNumber(c.cliques)}</td>
                <td className="px-3 py-3 text-right font-mono text-white">{formatPercent(c.ctr)}</td>
                <td className="px-3 py-3 text-right font-mono text-white">{c.conversoes}</td>
                <td className="px-3 py-3 text-right font-mono text-muted-foreground">{c.impressaoParcela}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const KPI_BLOCKS = googleKPIs.map((k, i) => ({
  id: `google-kpi-${i}`,
  defaultColSpan: 1,
  defaultRowSpan: 1,
  minColSpan: 1,
  maxColSpan: 4,
  minRowSpan: 1,
  maxRowSpan: 3,
  render: () => <GoogleKpiCard {...k} />,
}))

const GOOGLE_DASHBOARD_BLOCKS = [
  {
    id: 'google-header',
    defaultColSpan: 8,
    defaultRowSpan: 1,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 1,
    maxRowSpan: 2,
    render: () => (
      <div className="flex items-center gap-2 py-1">
        <div className="flex items-center gap-2 bg-[#4285F4]/15 border border-[#4285F4]/30 rounded-lg px-3 py-1.5">
          <Search size={14} className="text-[#4285F4]" />
          <span className="text-xs font-sans font-semibold text-[#4285F4]">Google Ads</span>
        </div>
        <span className="text-xs text-muted-foreground font-sans">Janeiro 2025 • Todas as Campanhas</span>
      </div>
    ),
  },
  ...KPI_BLOCKS,
  {
    id: 'google-clicks',
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
    defaultColSpan: 5,
    defaultRowSpan: 4,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 10,
    render: () => <GoogleCampaignsTable />,
  },
]

export default function GoogleAds() {
  return (
    <div className="min-h-full">
      <SuperAdminEnvLive
        endpoint="/api/admin/platform/google-ads-overview"
        title="Super Admin · Google Ads API (campanhas · últimos 30 dias)"
      />
      <DashboardGrid pageId="GoogleAds" definitions={GOOGLE_DASHBOARD_BLOCKS} className="min-h-full" />
    </div>
  )
}
