import { useState } from 'react'
import { Search, TrendingUp, TrendingDown, Plus, ArrowUpDown, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const keywords = [
  { id: 1, keyword: 'consultoria financeira', matchType: 'Exata', status: 'active', bid: 3.20, cpc: 2.45, impressoes: 8420, cliques: 312, ctr: 3.71, conversoes: 4, custoConv: 190.80, posicao: 1.2, qualidade: 8, delta: +5.2 },
  { id: 2, keyword: 'planejamento financeiro', matchType: 'Frase', status: 'active', bid: 2.80, cpc: 1.98, impressoes: 6130, cliques: 245, ctr: 4.00, conversoes: 3, custoConv: 161.70, posicao: 1.5, qualidade: 9, delta: +8.1 },
  { id: 3, keyword: 'investimentos pessoais', matchType: 'Ampla', status: 'active', bid: 4.00, cpc: 3.12, impressoes: 5890, cliques: 198, ctr: 3.36, conversoes: 2, custoConv: 308.88, posicao: 2.1, qualidade: 7, delta: -3.4 },
  { id: 4, keyword: 'gestão patrimônio', matchType: 'Exata', status: 'active', bid: 5.50, cpc: 4.20, impressoes: 4210, cliques: 167, ctr: 3.97, conversoes: 1, custoConv: 701.40, posicao: 1.8, qualidade: 6, delta: -1.2 },
  { id: 5, keyword: 'consultoria riqueza', matchType: 'Frase', status: 'active', bid: 3.80, cpc: 2.87, impressoes: 3450, cliques: 134, ctr: 3.88, conversoes: 1, custoConv: 384.58, posicao: 2.3, qualidade: 7, delta: +2.9 },
  { id: 6, keyword: 'fundos imobiliarios sp', matchType: 'Exata', status: 'paused', bid: 2.50, cpc: 1.75, impressoes: 2890, cliques: 89, ctr: 3.08, conversoes: 0, custoConv: null, posicao: 2.8, qualidade: 5, delta: -8.3 },
  { id: 7, keyword: 'renda variavel iniciantes', matchType: 'Ampla', status: 'active', bid: 1.80, cpc: 1.20, impressoes: 7200, cliques: 288, ctr: 4.00, conversoes: 0, custoConv: null, posicao: 3.1, qualidade: 5, delta: +1.5 },
]

const MATCH_COLORS = { 'Exata': 'text-brand bg-brand/10 border-brand/30', 'Frase': 'text-accent-purple bg-purple-accent/10 border-purple-accent/30', 'Ampla': 'text-blue-400 bg-blue-400/10 border-blue-400/30' }

const chartData = keywords.slice(0, 6).map(k => ({ name: k.keyword.split(' ').slice(0, 2).join(' '), ctr: k.ctr, impressoes: k.impressoes / 1000 }))

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-sans text-muted-foreground mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-sans text-muted-foreground">{p.name}:</span>
          <span className="font-mono text-white">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function PalavrasChave() {
  const [search, setSearch] = useState('')
  const [matchFilter, setMatchFilter] = useState('all')
  const [sortKey, setSortKey] = useState('impressoes')
  const [sortDir, setSortDir] = useState('desc')

  const filtered = keywords.filter(k => {
    const ms = k.keyword.toLowerCase().includes(search.toLowerCase())
    const mm = matchFilter === 'all' || k.matchType === matchFilter
    return ms && mm
  }).sort((a, b) => {
    const mult = sortDir === 'desc' ? -1 : 1
    const av = a[sortKey] ?? -1, bv = b[sortKey] ?? -1
    return (av > bv ? 1 : -1) * mult
  })

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <ArrowUpDown size={10} className="opacity-30" />
    return sortDir === 'desc' ? <ArrowDown size={10} className="text-brand" /> : <ArrowUp size={10} className="text-brand" />
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Chart */}
      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={13} className="text-brand" />
            <span className="section-title">CTR por Palavra-chave</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-sans">Top 6 palavras</span>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ctr" name="CTR %" fill="#F5C518" radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar palavra-chave..." className="w-full bg-surface-card border border-surface-border rounded-md pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-brand/50 font-sans" />
        </div>
        <div className="flex items-center gap-1">
          {['all', 'Exata', 'Frase', 'Ampla'].map(m => (
            <button key={m} onClick={() => setMatchFilter(m)} className={cn('text-xs px-2.5 py-1.5 rounded-md font-sans transition-all', matchFilter === m ? 'bg-brand text-[#0F0F0F] font-semibold' : 'bg-surface-card border border-surface-border text-muted-foreground hover:text-white')}>
              {m === 'all' ? 'Todos' : m}
            </button>
          ))}
        </div>
        <button className="ml-auto flex items-center gap-1.5 bg-brand text-[#0F0F0F] text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-brand/90 transition-all">
          <Plus size={13} /> Adicionar
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-surface-border bg-surface-input">
                {[
                  { key: 'keyword', label: 'Palavra-chave', align: 'left' },
                  { key: 'matchType', label: 'Tipo', align: 'left' },
                  { key: 'qualidade', label: 'Qualidade', align: 'right' },
                  { key: 'bid', label: 'Lance', align: 'right' },
                  { key: 'cpc', label: 'CPC Real', align: 'right' },
                  { key: 'impressoes', label: 'Impressões', align: 'right' },
                  { key: 'cliques', label: 'Cliques', align: 'right' },
                  { key: 'ctr', label: 'CTR', align: 'right' },
                  { key: 'conversoes', label: 'Conv.', align: 'right' },
                  { key: 'posicao', label: 'Posição', align: 'right' },
                  { key: 'delta', label: 'Var.', align: 'right' },
                ].map(col => (
                  <th key={col.key} className={cn('px-3 py-2.5 text-[10px] uppercase tracking-wider font-sans font-medium text-muted-foreground cursor-pointer hover:text-white transition-colors', col.align === 'right' ? 'text-right' : 'text-left')} onClick={() => handleSort(col.key)}>
                    <div className={cn('flex items-center gap-1', col.align === 'right' && 'justify-end')}>
                      {col.label}
                      <SortIcon col={col.key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(kw => (
                <tr key={kw.id} className="border-b border-surface-border/50 last:border-0 hover:bg-surface-hover/40 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', kw.status === 'active' ? 'bg-green-400' : 'bg-yellow-400')} />
                      <span className="font-sans text-white">{kw.keyword}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-mono', MATCH_COLORS[kw.matchType])}>{kw.matchType}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className={cn('w-1 h-3 rounded-sm', i < kw.qualidade ? (kw.qualidade >= 7 ? 'bg-green-400' : kw.qualidade >= 5 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-surface-border')} />
                      ))}
                      <span className={cn('ml-1 font-mono text-[10px]', kw.qualidade >= 7 ? 'text-green-400' : kw.qualidade >= 5 ? 'text-yellow-400' : 'text-red-400')}>{kw.qualidade}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-muted-foreground">{formatCurrency(kw.bid)}</td>
                  <td className="px-3 py-3 text-right font-mono text-white">{formatCurrency(kw.cpc)}</td>
                  <td className="px-3 py-3 text-right font-mono text-white">{formatNumber(kw.impressoes)}</td>
                  <td className="px-3 py-3 text-right font-mono text-white">{formatNumber(kw.cliques)}</td>
                  <td className="px-3 py-3 text-right font-mono text-white">{formatPercent(kw.ctr)}</td>
                  <td className="px-3 py-3 text-right font-mono text-white">{kw.conversoes}</td>
                  <td className="px-3 py-3 text-right font-mono text-white">#{kw.posicao.toFixed(1)}</td>
                  <td className="px-3 py-3 text-right">
                    <div className={cn('flex items-center justify-end gap-0.5 font-mono text-[11px]', kw.delta > 0 ? 'text-green-400' : 'text-red-400')}>
                      {kw.delta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {kw.delta > 0 ? '+' : ''}{kw.delta}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-surface-border text-[10px] text-muted-foreground font-sans">
          {filtered.length} de {keywords.length} palavras-chave
        </div>
      </div>
    </div>
  )
}
