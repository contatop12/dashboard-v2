import { MapPin, Eye, Phone, Navigation, Star, Search, TrendingUp, TrendingDown, Globe, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import DashboardGrid from '@/components/DashboardGrid'
import SuperAdminEnvLive from '@/components/SuperAdminEnvLive'
import SuperAdminAccountTitle from '@/components/SuperAdminAccountTitle'
import ChannelAccountPicker from '@/components/ChannelAccountPicker'

const kpis = [
  { label: 'Buscas Diretas', value: '2.840', delta: +18.3, icon: Search, desc: 'Pesquisaram pelo nome' },
  { label: 'Buscas por Descoberta', value: '5.120', delta: +24.1, icon: Globe, desc: 'Pesquisaram por categoria' },
  { label: 'Visualizações', value: '12.450', delta: +15.7, icon: Eye, desc: 'Total Maps + Pesquisa' },
  { label: 'Cliques no Site', value: '834', delta: +9.2, icon: Globe, desc: 'Visitas ao website' },
  { label: 'Ligações', value: '127', delta: -3.4, icon: Phone, desc: 'Chamadas recebidas' },
  { label: 'Rotas Solicitadas', value: '312', delta: +11.5, icon: Navigation, desc: 'Como chegar' },
  { label: 'Avaliação Média', value: '4.8★', delta: +0.2, icon: Star, desc: 'Google Reviews' },
  { label: 'Total Avaliações', value: '148', delta: +12, icon: MessageSquare, desc: 'Reviews recebidos' },
]

const weeklyData = [
  { sem: 'Sem 1', buscas: 1820, visualizacoes: 4200, acoes: 312 },
  { sem: 'Sem 2', buscas: 2100, visualizacoes: 4800, acoes: 356 },
  { sem: 'Sem 3', buscas: 1950, visualizacoes: 4500, acoes: 289 },
  { sem: 'Sem 4', buscas: 2090, visualizacoes: 4950, acoes: 316 },
]

const searchTerms = [
  { termo: 'consultoria financeira são paulo', buscas: 1240, tipo: 'Descoberta' },
  { termo: 'p12 digital', buscas: 980, tipo: 'Direta' },
  { termo: 'planejamento financeiro sp', buscas: 760, tipo: 'Descoberta' },
  { termo: 'p12 consultoria', buscas: 540, tipo: 'Direta' },
  { termo: 'gestão patrimonial perto de mim', buscas: 380, tipo: 'Descoberta' },
]

const reviews = [
  { nome: 'Maria S.', nota: 5, texto: 'Excelente atendimento! Consegui organizar minhas finanças e aumentar meu patrimônio em 30% em um ano.', data: '2 dias atrás' },
  { nome: 'João P.', nota: 5, texto: 'Equipe muito profissional. Recomendo para quem busca investimentos inteligentes.', data: '1 semana atrás' },
  { nome: 'Ana C.', nota: 4, texto: 'Ótimo serviço, apenas o tempo de resposta poderia ser melhor.', data: '2 semanas atrás' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-sans text-muted-foreground mb-1.5">{label}</p>
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

function GmbKpiCard({ label, value, delta, icon: Icon, desc }) {
  const isPos = delta > 0
  return (
    <div className="kpi-card flex min-h-0 w-full shrink-0 flex-col">
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span className="kpi-label truncate">{label}</span>
        <div className="w-6 h-6 shrink-0 rounded-md bg-[#34A853]/15 flex items-center justify-center">
          <Icon size={12} className="text-[#34A853]" />
        </div>
      </div>
      <span className="kpi-value mt-1 tabular-nums truncate">{value}</span>
      <div className="flex flex-wrap items-center gap-2 mt-0.5 min-w-0">
        <div className={cn('flex items-center gap-0.5 text-[10px] font-mono shrink-0', isPos ? 'text-green-400' : 'text-red-400')}>
          {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {isPos ? '+' : ''}
          {delta}%
        </div>
        <span className="text-[10px] text-muted-foreground font-sans truncate min-w-0">{desc}</span>
      </div>
    </div>
  )
}

function GmbWeeklyBars() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <span className="section-title block mb-3 shrink-0">Buscas & Visualizações por Semana</span>
      <div className="h-44 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
            <XAxis dataKey="sem" tick={{ fontSize: 10, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="buscas" name="Buscas" fill="#4285F4" radius={[3, 3, 0, 0]} opacity={0.8} />
            <Bar dataKey="visualizacoes" name="Visualizações" fill="#34A853" radius={[3, 3, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function GmbWeeklyArea() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <span className="section-title block mb-3 shrink-0">Ações dos Usuários por Semana</span>
      <div className="h-44 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="acaoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34A853" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#34A853" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
            <XAxis dataKey="sem" tick={{ fontSize: 10, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="acoes"
              name="Ações Totais"
              stroke="#34A853"
              strokeWidth={2}
              fill="url(#acaoGrad)"
              dot={{ r: 4, fill: '#34A853', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function GmbSearchTerms() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <span className="section-title block mb-3 shrink-0">Termos de Busca</span>
      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-auto">
        {searchTerms.map((t, i) => (
          <div key={t.termo} className="flex items-center gap-2 py-1.5">
            <span className="font-mono text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-sans text-white truncate">{t.termo}</span>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded font-mono',
                      t.tipo === 'Direta' ? 'bg-brand/15 text-brand' : 'bg-[#34A853]/15 text-[#34A853]'
                    )}
                  >
                    {t.tipo}
                  </span>
                  <span className="font-mono text-xs text-white">{formatNumber(t.buscas)}</span>
                </div>
              </div>
              <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(t.buscas / 1240) * 100}%`, background: t.tipo === 'Direta' ? '#F5C518' : '#34A853' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GmbReviews() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="section-title">Avaliações Recentes</span>
        <div className="flex items-center gap-1">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} className="flex items-center gap-0.5">
              <div className="w-2 h-4 rounded-sm bg-surface-border overflow-hidden">
                <div
                  className="w-full rounded-sm"
                  style={{ height: `${n === 5 ? 80 : n === 4 ? 15 : 5}%`, background: '#F5C518', marginTop: 'auto' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-auto">
        {reviews.map((r) => (
          <div key={r.nome} className="flex flex-col gap-1.5 pb-3 border-b border-surface-border last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-surface-input flex items-center justify-center text-[10px] font-mono text-white">
                  {r.nome[0]}
                </div>
                <span className="text-xs font-sans text-white font-medium">{r.nome}</span>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: r.nota }, (_, i) => (
                  <Star key={i} size={10} className="text-yellow-400" fill="currentColor" />
                ))}
                <span className="text-[10px] text-muted-foreground font-sans ml-1">{r.data}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-sans leading-relaxed line-clamp-2">{r.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const KPI_BLOCKS = kpis.map((k, i) => ({
  id: `gmb-kpi-${i}`,
  defaultColSpan: 1,
  defaultRowSpan: 1,
  minColSpan: 1,
  maxColSpan: 4,
  minRowSpan: 1,
  maxRowSpan: 3,
  render: () => <GmbKpiCard {...k} />,
}))

const GMB_DASHBOARD_BLOCKS = [
  {
    id: 'gmb-header',
    defaultColSpan: 8,
    defaultRowSpan: 1,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 1,
    maxRowSpan: 2,
    render: () => (
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 py-1">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-[#34A853]/30 bg-[#34A853]/15 px-3 py-1.5">
            <MapPin size={14} className="text-[#34A853]" />
            <span className="text-xs font-sans font-semibold text-[#34A853]">Google Meu Negócio</span>
          </div>
          <span className="text-xs font-sans text-muted-foreground">Janeiro 2025</span>
        </div>
        <ChannelAccountPicker provider="google_business" className="shrink-0" />
        <SuperAdminAccountTitle
          className="flex-1"
          endpoint="/api/admin/platform/google-business-overview"
          emptyLabel="Nome do perfil (Google Business)"
        />
        <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border border-yellow-400/30 bg-yellow-400/10 px-2 py-1">
          <Star size={11} className="text-yellow-400" fill="currentColor" />
          <span className="font-mono text-xs font-semibold text-yellow-400">4.8</span>
          <span className="font-sans text-[10px] text-muted-foreground">(148)</span>
        </div>
      </div>
    ),
  },
  ...KPI_BLOCKS,
  {
    id: 'gmb-weekly-bars',
    defaultColSpan: 4,
    defaultRowSpan: 3,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <GmbWeeklyBars />,
  },
  {
    id: 'gmb-weekly-area',
    defaultColSpan: 4,
    defaultRowSpan: 3,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <GmbWeeklyArea />,
  },
  {
    id: 'gmb-terms',
    defaultColSpan: 4,
    defaultRowSpan: 4,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 10,
    render: () => <GmbSearchTerms />,
  },
  {
    id: 'gmb-reviews',
    defaultColSpan: 4,
    defaultRowSpan: 4,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 10,
    render: () => <GmbReviews />,
  },
]

export default function GoogleMeuNegocio() {
  return (
    <div className="min-h-full">
      <SuperAdminEnvLive
        endpoint="/api/admin/platform/google-business-overview"
        title="Super Admin · Google Business (contas · refresh token)"
      />
      <DashboardGrid pageId="GoogleMeuNegocio" definitions={GMB_DASHBOARD_BLOCKS} className="min-h-full" />
    </div>
  )
}
