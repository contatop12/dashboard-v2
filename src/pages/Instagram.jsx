import { Instagram, Heart, MessageCircle, Share2, Users, TrendingUp, TrendingDown, Eye, Bookmark, UserPlus, Film, Image, Grid } from 'lucide-react'
import CreativesCarousel from '@/components/CreativesCarousel'
import { cn } from '@/lib/utils'
import { formatNumber, formatPercent } from '@/lib/utils'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import DashboardGrid from '@/components/DashboardGrid'
import SuperAdminEnvLive from '@/components/SuperAdminEnvLive'
import SuperAdminAccountTitle from '@/components/SuperAdminAccountTitle'

const kpis = [
  { label: 'Seguidores', value: '12.840', delta: +4.2, icon: Users },
  { label: 'Alcance', value: '45.200', delta: +22.1, icon: Eye },
  { label: 'Impressões', value: '78.500', delta: +18.4, icon: Eye },
  { label: 'Engajamento', value: '3.8%', delta: +0.5, icon: Heart },
  { label: 'Curtidas', value: '4.280', delta: +12.3, icon: Heart },
  { label: 'Comentários', value: '312', delta: +8.9, icon: MessageCircle },
  { label: 'Salvamentos', value: '890', delta: +31.2, icon: Bookmark },
  { label: 'Novos Seguidores', value: '+348', delta: +15.6, icon: UserPlus },
]

const dailyData = [
  { dia: '01', alcance: 1200, impressoes: 2100, engajamento: 3.5 },
  { dia: '05', alcance: 1850, impressoes: 3200, engajamento: 4.1 },
  { dia: '08', alcance: 980, impressoes: 1700, engajamento: 2.9 },
  { dia: '10', alcance: 3200, impressoes: 5800, engajamento: 5.2 },
  { dia: '12', alcance: 1540, impressoes: 2700, engajamento: 3.8 },
  { dia: '15', alcance: 4100, impressoes: 7200, engajamento: 6.1 },
  { dia: '17', alcance: 2200, impressoes: 3900, engajamento: 4.4 },
  { dia: '19', alcance: 5300, impressoes: 9100, engajamento: 7.2 },
  { dia: '22', alcance: 2800, impressoes: 4900, engajamento: 4.8 },
  { dia: '24', alcance: 1600, impressoes: 2800, engajamento: 3.2 },
  { dia: '26', alcance: 3500, impressoes: 6200, engajamento: 5.5 },
  { dia: '28', alcance: 2100, impressoes: 3700, engajamento: 4.0 },
  { dia: '31', alcance: 1300, impressoes: 2300, engajamento: 3.6 },
]

const contentTypes = [
  { name: 'Reels', value: 42, color: '#FF6B6B' },
  { name: 'Feed', value: 31, color: '#F5C518' },
  { name: 'Stories', value: 20, color: '#9B8EFF' },
  { name: 'Carrossel', value: 7, color: '#4A9BFF' },
]

const topPosts = [
  { tipo: 'reel', desc: 'Dica de investimento #1', alcance: 8420, curtidas: 642, comentarios: 48, salvamentos: 234, taxa: 11.0 },
  { tipo: 'carrossel', desc: '5 erros ao investir', alcance: 6180, curtidas: 498, comentarios: 67, salvamentos: 189, taxa: 12.2 },
  { tipo: 'feed', desc: 'Resultado cliente — +47%', alcance: 5340, curtidas: 387, comentarios: 31, salvamentos: 145, taxa: 10.5 },
  { tipo: 'reel', desc: 'Como montar sua reserva', alcance: 4920, curtidas: 356, comentarios: 29, salvamentos: 201, taxa: 12.0 },
  { tipo: 'stories', desc: 'Quiz: Perfil investidor', alcance: 3800, curtidas: 0, comentarios: 0, salvamentos: 0, taxa: 8.2 },
]

const igPosts = [
  {
    name: 'Dica de investimento #1 — resultados surpreendentes',
    gradient: 'linear-gradient(145deg, #4a0040 0%, #1a0015 100%)',
    tag: 'Reel',
    tagBg: '#FF6B6B25',
    tagColor: '#FF6B6B',
    metrics: [
      { label: 'Alcance', value: '8.420', highlight: true },
      { label: 'Curtidas', value: '642' },
      { label: 'Taxa Eng.', value: '11,0%' },
    ],
  },
  {
    name: '5 erros que todo investidor comete',
    gradient: 'linear-gradient(145deg, #1a3a5c 0%, #0d1b2a 100%)',
    tag: 'Carrossel',
    tagBg: '#4A9BFF25',
    tagColor: '#4A9BFF',
    metrics: [
      { label: 'Alcance', value: '6.180', highlight: true },
      { label: 'Curtidas', value: '498' },
      { label: 'Taxa Eng.', value: '12,2%' },
    ],
  },
  {
    name: 'Resultado de cliente — +47% em 3 meses',
    gradient: 'linear-gradient(145deg, #2d1b00 0%, #1a1000 100%)',
    tag: 'Feed',
    tagBg: '#F5C51825',
    tagColor: '#F5C518',
    metrics: [
      { label: 'Alcance', value: '5.340', highlight: true },
      { label: 'Curtidas', value: '387' },
      { label: 'Taxa Eng.', value: '10,5%' },
    ],
  },
  {
    name: 'Como montar sua reserva de emergência',
    gradient: 'linear-gradient(145deg, #0f3d2b 0%, #061a12 100%)',
    tag: 'Reel',
    tagBg: '#FF6B6B25',
    tagColor: '#FF6B6B',
    metrics: [
      { label: 'Alcance', value: '4.920', highlight: true },
      { label: 'Curtidas', value: '356' },
      { label: 'Taxa Eng.', value: '12,0%' },
    ],
  },
  {
    name: 'Quiz: Descubra seu perfil de investidor',
    gradient: 'linear-gradient(145deg, #1a1a4a 0%, #0a0a28 100%)',
    tag: 'Stories',
    tagBg: '#9B8EFF25',
    tagColor: '#9B8EFF',
    metrics: [
      { label: 'Alcance', value: '3.800', highlight: true },
      { label: 'Respostas', value: '147' },
      { label: 'Taxa Eng.', value: '8,2%' },
    ],
  },
  {
    name: 'Tesouro Direto vs CDB — qual escolher?',
    gradient: 'linear-gradient(145deg, #3d0a1a 0%, #200511 100%)',
    tag: 'Carrossel',
    tagBg: '#4A9BFF25',
    tagColor: '#4A9BFF',
    metrics: [
      { label: 'Alcance', value: '4.210', highlight: true },
      { label: 'Curtidas', value: '411' },
      { label: 'Taxa Eng.', value: '13,1%' },
    ],
  },
]

const TIPO_ICONS = { reel: Film, carrossel: Grid, feed: Image, stories: Eye }
const TIPO_COLORS = { reel: '#FF6B6B', carrossel: '#4A9BFF', feed: '#F5C518', stories: '#9B8EFF' }

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

function IgKpiCard({ label, value, delta, icon: Icon }) {
  const isPos = delta > 0
  return (
    <div className="kpi-card flex min-h-0 w-full shrink-0 flex-col">
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span className="kpi-label truncate">{label}</span>
        <div className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e6683c30, #cc236630)' }}>
          <Icon size={12} style={{ color: '#e6683c' }} />
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

function IgReachChart() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <span className="section-title block mb-3 shrink-0">Alcance & Engajamento Diário</span>
      <div className="h-44 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e6683c" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#e6683c" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="alcance" tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="eng"
              orientation="right"
              tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="alcance"
              type="monotone"
              dataKey="alcance"
              name="Alcance"
              stroke="#e6683c"
              strokeWidth={2}
              fill="url(#igGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#e6683c', strokeWidth: 0 }}
            />
            <Line
              yAxisId="eng"
              type="monotone"
              dataKey="engajamento"
              name="Eng. %"
              stroke="#9B8EFF"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3, fill: '#9B8EFF', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function IgContentTypes() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-full min-h-0 flex flex-col">
      <span className="section-title block mb-3 shrink-0">Tipo de Conteúdo</span>
      <div className="flex items-center gap-2 flex-1 min-h-0">
        <div className="w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={contentTypes}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={48}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {contentTypes.map((c, i) => (
                  <Cell key={i} fill={c.color} />
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
          {contentTypes.map((c) => (
            <div key={c.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
              <span className="text-[10px] font-sans text-muted-foreground flex-1 truncate">{c.name}</span>
              <span className="font-mono text-[11px] text-white">{c.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IgTopPostsTable() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden min-w-0 h-full flex flex-col">
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between shrink-0">
        <span className="section-title">Top Posts — Janeiro</span>
        <span className="text-[10px] text-muted-foreground font-sans">por taxa de engajamento</span>
      </div>
      <div className="overflow-x-auto flex-1 min-h-0">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-surface-border bg-surface-input">
              {['Post', 'Tipo', 'Alcance', 'Curtidas', 'Comentários', 'Salvamentos', 'Taxa Eng.'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-3 py-2.5 text-[10px] uppercase tracking-wider font-sans font-medium text-muted-foreground',
                    h === 'Post' ? 'text-left' : 'text-right'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topPosts.map((p, i) => {
              const Icon = TIPO_ICONS[p.tipo]
              const color = TIPO_COLORS[p.tipo]
              return (
                <tr key={i} className="border-b border-surface-border/50 last:border-0 hover:bg-surface-hover/40 transition-colors">
                  <td className="px-3 py-3 font-sans text-white">{p.desc}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Icon size={11} style={{ color }} />
                      <span className="font-mono text-[10px]" style={{ color }}>
                        {p.tipo}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-white">{formatNumber(p.alcance)}</td>
                  <td className="px-3 py-3 text-right font-mono text-white">{p.curtidas || '—'}</td>
                  <td className="px-3 py-3 text-right font-mono text-white">{p.comentarios || '—'}</td>
                  <td className="px-3 py-3 text-right font-mono text-white">{p.salvamentos || '—'}</td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className={cn(
                        'font-mono text-xs font-semibold',
                        p.taxa >= 10 ? 'text-green-400' : p.taxa >= 5 ? 'text-yellow-400' : 'text-muted-foreground'
                      )}
                    >
                      {p.taxa}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const KPI_BLOCKS = kpis.map((k, i) => ({
  id: `ig-kpi-${i}`,
  defaultColSpan: 1,
  defaultRowSpan: 1,
  minColSpan: 1,
  maxColSpan: 4,
  minRowSpan: 1,
  maxRowSpan: 3,
  render: () => <IgKpiCard {...k} />,
}))

const IG_DASHBOARD_BLOCKS = [
  {
    id: 'ig-header',
    defaultColSpan: 8,
    defaultRowSpan: 1,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 1,
    maxRowSpan: 2,
    render: () => (
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 py-1">
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{
              background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              opacity: 0.9,
            }}
          >
            <Instagram size={14} className="text-white" />
            <span className="text-xs font-sans font-semibold text-white">Instagram</span>
          </div>
          <span className="text-xs font-sans text-muted-foreground">Janeiro 2025</span>
        </div>
        <SuperAdminAccountTitle
          endpoint="/api/admin/platform/instagram-overview"
          emptyLabel="@usuário do Instagram"
        />
      </div>
    ),
  },
  ...KPI_BLOCKS,
  {
    id: 'ig-reach',
    defaultColSpan: 5,
    defaultRowSpan: 3,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <IgReachChart />,
  },
  {
    id: 'ig-content-types',
    defaultColSpan: 3,
    defaultRowSpan: 3,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <IgContentTypes />,
  },
  {
    id: 'ig-carousel',
    defaultColSpan: 8,
    defaultRowSpan: 2,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <CreativesCarousel title="Posts — Instagram" badge={`${igPosts.length} publicações`} cards={igPosts} />,
  },
  {
    id: 'ig-top-posts',
    defaultColSpan: 8,
    defaultRowSpan: 3,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 10,
    render: () => <IgTopPostsTable />,
  },
]

export default function InstagramPage() {
  return (
    <div className="min-h-full">
      <SuperAdminEnvLive
        endpoint="/api/admin/platform/instagram-overview"
        title="Super Admin · Instagram (Graph · perfil / insights)"
      />
      <DashboardGrid pageId="Instagram" definitions={IG_DASHBOARD_BLOCKS} className="min-h-full" />
    </div>
  )
}
