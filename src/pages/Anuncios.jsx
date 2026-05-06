import { useState } from 'react'
import { Search, Filter, Plus, ExternalLink, MoreHorizontal, Eye, MousePointer, TrendingUp, Image, Type, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils'

const AD_TYPES = { search: { label: 'Search', icon: Type, color: '#4A9BFF' }, display: { label: 'Display', icon: Image, color: '#9B8EFF' }, video: { label: 'Video', icon: Video, color: '#FF6B6B' } }

const ads = [
  { id: 1, title: 'Consultoria Financeira Premium', desc: 'Maximize seus investimentos com especialistas. Agende uma consulta gratuita hoje!', url: 'site.com.br/consultoria', type: 'search', status: 'active', campanha: 'Campanha_Leads_SP_Jan', impressoes: 12400, cliques: 520, ctr: 4.19, cpc: 2.10, qualidade: 8 },
  { id: 2, title: 'Planejamento Patrimonial', desc: 'Proteja e multiplique seu patrimônio. Estratégias personalizadas para você.', url: 'site.com.br/patrimonio', type: 'search', status: 'active', campanha: 'Campanha_Leads_SP_Jan', impressoes: 9800, cliques: 398, ctr: 4.06, cpc: 2.34, qualidade: 7 },
  { id: 3, title: 'Retarget - Visitantes SP', desc: 'Banner 300x250 — Visitou e não converteu', url: 'site.com.br', type: 'display', status: 'active', campanha: 'Campanha_Retarget_RJ', impressoes: 8200, cliques: 205, ctr: 2.50, cpc: 3.80, qualidade: null },
  { id: 4, title: 'Brand Video 30s', desc: 'Vídeo institucional — "Quem somos"', url: 'youtube.com/watch?v=xxx', type: 'video', status: 'paused', campanha: 'Campanha_Video_YouTube', impressoes: 42000, cliques: 210, ctr: 0.50, cpc: 0.28, qualidade: null },
  { id: 5, title: 'Gestão de Investimentos RJ', desc: 'Especialistas em renda variável e fundos imobiliários. Conheça nossas soluções.', url: 'site.com.br/investimentos', type: 'search', status: 'active', campanha: 'Campanha_Brand_MG', impressoes: 6100, cliques: 183, ctr: 3.00, cpc: 2.89, qualidade: 6 },
]

function QualityDots({ score }) {
  if (!score) return <span className="text-muted-foreground text-[10px] font-sans">N/A</span>
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={cn('w-1.5 h-1.5 rounded-full', i < score ? (score >= 7 ? 'bg-green-400' : score >= 5 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-surface-border')} />
      ))}
      <span className={cn('ml-1 font-mono text-[10px]', score >= 7 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400')}>{score}/10</span>
    </div>
  )
}

export default function Anuncios() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState('table')

  const filtered = ads.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || a.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total Anúncios', value: ads.length, icon: Type },
          { label: 'Impressões', value: formatNumber(ads.reduce((s, a) => s + a.impressoes, 0)), icon: Eye },
          { label: 'Cliques', value: formatNumber(ads.reduce((s, a) => s + a.cliques, 0)), icon: MousePointer },
          { label: 'CTR Médio', value: formatPercent(ads.reduce((s, a) => s + a.ctr, 0) / ads.length), icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="kpi-card">
            <div className="flex items-center justify-between">
              <span className="kpi-label">{label}</span>
              <div className="w-6 h-6 rounded-md bg-brand/15 flex items-center justify-center"><Icon size={12} className="text-brand" /></div>
            </div>
            <span className="kpi-value mt-1">{value}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar anúncio..." className="w-full bg-surface-card border border-surface-border rounded-md pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-brand/50 font-sans" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setTypeFilter('all')} className={cn('text-xs px-2.5 py-1.5 rounded-md font-sans transition-all', typeFilter === 'all' ? 'bg-brand text-[#0F0F0F] font-semibold' : 'bg-surface-card border border-surface-border text-muted-foreground hover:text-white')}>Todos</button>
          {Object.entries(AD_TYPES).map(([key, { label, icon: Icon, color }]) => (
            <button key={key} onClick={() => setTypeFilter(key)} className={cn('flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md font-sans transition-all', typeFilter === key ? 'bg-surface-hover border border-surface-border text-white' : 'bg-surface-card border border-surface-border text-muted-foreground hover:text-white')}>
              <Icon size={11} style={{ color }} />
              {label}
            </button>
          ))}
        </div>
        <button className="ml-auto flex items-center gap-1.5 bg-brand text-[#0F0F0F] text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-brand/90 transition-all">
          <Plus size={13} /> Novo Anúncio
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(ad => {
          const t = AD_TYPES[ad.type]
          const Icon = t.icon
          return (
            <div key={ad.id} className="bg-surface-card border border-surface-border rounded-lg p-4 flex flex-col gap-3 hover:border-brand/30 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${t.color}20`, border: `1px solid ${t.color}40` }}>
                    <Icon size={13} style={{ color: t.color }} />
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: t.color }}>{t.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono', ad.status === 'active' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400')}>
                    {ad.status === 'active' ? '● Ativo' : '● Pausado'}
                  </span>
                  <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-surface-border transition-all">
                    <MoreHorizontal size={12} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-sm font-sans font-semibold text-white leading-snug line-clamp-1">{ad.title}</p>
                <p className="text-[11px] font-sans text-muted-foreground leading-relaxed line-clamp-2">{ad.desc}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <ExternalLink size={10} className="text-brand" />
                  <span className="text-[10px] text-brand font-mono truncate">{ad.url}</span>
                </div>
              </div>

              <div className="border-t border-surface-border pt-3 grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-sans">Impressões</span>
                  <span className="font-mono text-xs text-white">{formatNumber(ad.impressoes)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-sans">CTR</span>
                  <span className="font-mono text-xs text-white">{formatPercent(ad.ctr)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-sans">CPC</span>
                  <span className="font-mono text-xs text-white">{formatCurrency(ad.cpc)}</span>
                </div>
              </div>

              {ad.qualidade && (
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-sans">Índice de Qualidade</span>
                  <QualityDots score={ad.qualidade} />
                </div>
              )}

              <span className="text-[9px] text-muted-foreground font-sans truncate">{ad.campanha}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
