import { useState } from 'react'
import { Plus, Search, MoreHorizontal, Pause, Play, Pencil, TrendingUp, TrendingDown, Target, DollarSign, Eye, MousePointer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

const campaigns = [
  { id: 1, name: 'Campanha_Leads_SP_Jan', status: 'active', type: 'Search', objetivo: 'Geração de Leads', budget: 500, investido: 312.40, impressoes: 28450, cliques: 1172, leads: 6, ctr: 4.12, cpc: 2.67, custoLead: 52.07, delta: +12.4 },
  { id: 2, name: 'Campanha_Retarget_RJ', status: 'active', type: 'Display', objetivo: 'Retargeting', budget: 300, investido: 187.20, impressoes: 12300, cliques: 425, leads: 3, ctr: 3.45, cpc: 4.40, custoLead: 62.40, delta: -5.2 },
  { id: 3, name: 'Campanha_Brand_MG', status: 'paused', type: 'Search', objetivo: 'Marca', budget: 200, investido: 98.50, impressoes: 9250, cliques: 266, leads: 2, ctr: 2.87, cpc: 3.70, custoLead: 49.25, delta: +3.1 },
  { id: 4, name: 'Campanha_Performance_MAX', status: 'active', type: 'Performance Max', objetivo: 'Conversão', budget: 400, investido: 356.80, impressoes: 42100, cliques: 1685, leads: 0, ctr: 4.00, cpc: 2.12, custoLead: null, delta: +8.7 },
  { id: 5, name: 'Campanha_Video_YouTube', status: 'paused', type: 'Video', objetivo: 'Awareness', budget: 150, investido: 89.30, impressoes: 67500, cliques: 338, leads: 0, ctr: 0.50, cpc: 0.26, custoLead: null, delta: -2.8 },
]

const STATUS_COLORS = {
  active: { dot: 'bg-green-400', badge: 'text-green-400 bg-green-400/10 border-green-400/20', label: 'Ativo' },
  paused: { dot: 'bg-yellow-400', badge: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', label: 'Pausado' },
}

function StatCard({ label, value, icon: Icon, delta, accent = 'brand' }) {
  const isPositive = delta > 0
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between">
        <span className="kpi-label">{label}</span>
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', accent === 'brand' ? 'bg-brand/15' : 'bg-purple-accent/15')}>
          <Icon size={12} className={accent === 'brand' ? 'text-brand' : 'text-accent-purple'} />
        </div>
      </div>
      <span className="kpi-value mt-1">{value}</span>
      <div className={cn('flex items-center gap-0.5 text-[10px] font-mono mt-0.5', isPositive ? 'text-green-400' : 'text-red-400')}>
        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        <span>{isPositive ? '+' : ''}{delta}% vs mês ant.</span>
      </div>
    </div>
  )
}

export default function Campanhas() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())

  const filtered = campaigns.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  function toggleSelect(id) {
    setSelected(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <StatCard label="Total Campanhas" value={campaigns.length} icon={Target} delta={+20} />
        <StatCard label="Investimento Total" value="R$1,04mil" icon={DollarSign} delta={+8.2} />
        <StatCard label="Impressões" value="159,6mil" icon={Eye} delta={+14.5} accent="purple" />
        <StatCard label="Cliques" value="3.886" icon={MousePointer} delta={+6.1} accent="purple" />
        <StatCard label="Total Leads" value="11" icon={Target} delta={-9.1} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar campanha..." className="w-full bg-surface-card border border-surface-border rounded-md pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-brand/50 font-sans" />
        </div>
        <div className="flex items-center gap-1">
          {['all', 'active', 'paused'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('text-xs px-2.5 py-1.5 rounded-md transition-all font-sans', statusFilter === s ? 'bg-brand text-[#0F0F0F] font-semibold' : 'bg-surface-card border border-surface-border text-muted-foreground hover:text-white')}>
              {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Pausados'}
            </button>
          ))}
        </div>
        <button className="ml-auto flex items-center gap-1.5 bg-brand text-[#0F0F0F] text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-brand/90 transition-all">
          <Plus size={13} />
          Nova Campanha
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-surface-border bg-surface-input">
                <th className="w-8 px-3 py-2.5">
                  <input type="checkbox" className="accent-brand" onChange={e => setSelected(e.target.checked ? new Set(campaigns.map(c => c.id)) : new Set())} />
                </th>
                {['Campanha', 'Status', 'Tipo', 'Budget', 'Investido', 'Impressões', 'Cliques', 'Leads', 'CTR', 'CPC', ''].map(h => (
                  <th key={h} className={cn('px-3 py-2.5 text-[10px] uppercase tracking-wider font-sans font-medium text-muted-foreground', h === 'Campanha' ? 'text-left' : 'text-right', h === '' ? 'w-8' : '')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const s = STATUS_COLORS[c.status]
                return (
                  <tr key={c.id} className={cn('border-b border-surface-border/50 last:border-0 hover:bg-surface-hover/40 transition-colors', selected.has(c.id) && 'bg-brand/5')}>
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="accent-brand" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-sans text-white font-medium truncate max-w-[200px]">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground font-sans">{c.objetivo}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono', s.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-sans text-muted-foreground">{c.type}</td>
                    <td className="px-3 py-3 text-right font-mono text-white">{formatCurrency(c.budget)}</td>
                    <td className="px-3 py-3 text-right font-mono text-white">{formatCurrency(c.investido)}</td>
                    <td className="px-3 py-3 text-right font-mono text-white">{formatNumber(c.impressoes)}</td>
                    <td className="px-3 py-3 text-right font-mono text-white">{formatNumber(c.cliques)}</td>
                    <td className="px-3 py-3 text-right font-mono text-white">{c.leads}</td>
                    <td className="px-3 py-3 text-right font-mono text-white">{formatPercent(c.ctr)}</td>
                    <td className="px-3 py-3 text-right font-mono text-white">{formatCurrency(c.cpc)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className={cn('w-6 h-6 rounded flex items-center justify-center transition-all', c.status === 'active' ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-green-400 hover:bg-green-400/10')}>
                          {c.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                        <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-surface-border transition-all">
                          <Pencil size={12} />
                        </button>
                        <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-surface-border transition-all">
                          <MoreHorizontal size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-surface-border flex items-center justify-between text-[10px] text-muted-foreground font-sans">
          <span>{filtered.length} de {campaigns.length} campanhas</span>
          {selected.size > 0 && <span className="text-brand">{selected.size} selecionadas</span>}
        </div>
      </div>
    </div>
  )
}
