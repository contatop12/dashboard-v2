import { useState } from 'react'
import { Download, FileText, BarChart3, Calendar, TrendingUp, Eye, MousePointer, Target, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts'

const monthlyData = [
  { mes: 'Ago', investimento: 820, leads: 7, ctr: 3.2, impressoes: 38000 },
  { mes: 'Set', investimento: 950, leads: 9, ctr: 3.5, impressoes: 42000 },
  { mes: 'Out', investimento: 1100, leads: 8, ctr: 3.8, impressoes: 51000 },
  { mes: 'Nov', investimento: 1280, leads: 12, ctr: 4.1, impressoes: 58000 },
  { mes: 'Dez', investimento: 1050, leads: 6, ctr: 3.7, impressoes: 44000 },
  { mes: 'Jan', investimento: 1300, leads: 11, ctr: 3.98, impressoes: 50000 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-sans text-muted-foreground mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-sans text-muted-foreground">{p.name}:</span>
          <span className="font-mono text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const REPORT_TEMPLATES = [
  { id: 1, name: 'Performance Mensal', desc: 'KPIs, funil, comparativo mensal', icon: BarChart3, pages: 8 },
  { id: 2, name: 'Análise de Campanhas', desc: 'Detalhamento por campanha e grupo', icon: Target, pages: 12 },
  { id: 3, name: 'Palavras-chave', desc: 'Performance e oportunidades', icon: FileText, pages: 6 },
  { id: 4, name: 'Executivo Resumido', desc: 'Visão executiva de uma página', icon: TrendingUp, pages: 2 },
]

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface-card border border-surface-border rounded-lg p-1 w-fit">
        {[
          { key: 'overview', label: 'Visão Geral' },
          { key: 'trends', label: 'Tendências' },
          { key: 'export', label: 'Exportar' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn('text-xs px-4 py-1.5 rounded-md font-sans transition-all', activeTab === tab.key ? 'bg-brand text-[#0F0F0F] font-semibold' : 'text-muted-foreground hover:text-white')}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { label: 'Investimento Total (6M)', value: formatCurrency(monthlyData.reduce((s, m) => s + m.investimento, 0), { compact: true }), icon: DollarSign, color: 'brand' },
              { label: 'Total Leads (6M)', value: monthlyData.reduce((s, m) => s + m.leads, 0), icon: Target, color: 'brand' },
              { label: 'Impressões Totais', value: formatNumber(monthlyData.reduce((s, m) => s + m.impressoes, 0), true), icon: Eye, color: 'purple' },
              { label: 'CTR Médio', value: formatPercent(monthlyData.reduce((s, m) => s + m.ctr, 0) / monthlyData.length), icon: MousePointer, color: 'purple' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="kpi-card">
                <div className="flex items-center justify-between">
                  <span className="kpi-label">{label}</span>
                  <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', color === 'brand' ? 'bg-brand/15' : 'bg-purple-accent/15')}>
                    <Icon size={12} className={color === 'brand' ? 'text-brand' : 'text-accent-purple'} />
                  </div>
                </div>
                <span className="kpi-value mt-1">{value}</span>
              </div>
            ))}
          </div>

          {/* Investimento chart */}
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="section-title">Investimento vs Leads — 6 meses</span>
              <button className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-white transition-all font-sans">
                <Download size={11} /> Exportar
              </button>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F5C518" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F5C518" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="inv" tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `R$${v}`} />
                  <YAxis yAxisId="leads" orientation="right" tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area yAxisId="inv" type="monotone" dataKey="investimento" name="Investimento" stroke="#F5C518" strokeWidth={2} fill="url(#invGrad)" dot={{ r: 3, fill: '#F5C518', strokeWidth: 0 }} />
                  <Line yAxisId="leads" type="monotone" dataKey="leads" name="Leads" stroke="#9B8EFF" strokeWidth={2} dot={{ r: 3, fill: '#9B8EFF', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly table */}
          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-border">
              <span className="section-title">Resumo Mensal</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-input">
                    {['Mês', 'Investimento', 'Leads', 'Custo/Lead', 'Impressões', 'CTR'].map(h => (
                      <th key={h} className={cn('px-4 py-2.5 text-[10px] uppercase tracking-wider font-sans font-medium text-muted-foreground', h === 'Mês' ? 'text-left' : 'text-right')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((row, i) => (
                    <tr key={row.mes} className={cn('border-b border-surface-border/50 last:border-0 hover:bg-surface-hover/40 transition-colors', i === monthlyData.length - 1 && 'bg-brand/5')}>
                      <td className="px-4 py-3 font-sans text-white font-medium">{row.mes} {i === monthlyData.length - 1 && <span className="ml-1 text-[9px] text-brand font-mono">atual</span>}</td>
                      <td className="px-4 py-3 text-right font-mono text-white">{formatCurrency(row.investimento)}</td>
                      <td className="px-4 py-3 text-right font-mono text-white">{row.leads}</td>
                      <td className="px-4 py-3 text-right font-mono text-white">{formatCurrency(row.investimento / row.leads)}</td>
                      <td className="px-4 py-3 text-right font-mono text-white">{formatNumber(row.impressoes)}</td>
                      <td className="px-4 py-3 text-right font-mono text-white">{formatPercent(row.ctr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface-card border border-surface-border rounded-lg p-4">
              <span className="section-title block mb-3">CTR ao Longo do Tempo</span>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="ctr" name="CTR %" stroke="#9B8EFF" strokeWidth={2} dot={{ r: 4, fill: '#9B8EFF', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-surface-card border border-surface-border rounded-lg p-4">
              <span className="section-title block mb-3">Volume de Leads por Mês</span>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="leads" name="Leads" fill="#F5C518" radius={[4, 4, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REPORT_TEMPLATES.map(tpl => {
            const Icon = tpl.icon
            return (
              <div key={tpl.id} className="bg-surface-card border border-surface-border rounded-lg p-5 flex flex-col gap-3 hover:border-brand/40 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-brand/15 flex items-center justify-center">
                    <Icon size={18} className="text-brand" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{tpl.pages} pág.</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-display font-semibold text-white text-sm">{tpl.name}</span>
                  <span className="text-xs text-muted-foreground font-sans">{tpl.desc}</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-[#0F0F0F] text-xs font-semibold py-2 rounded-md hover:bg-brand/90 transition-all">
                    <Download size={12} /> PDF
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 bg-surface-input border border-surface-border text-white text-xs font-sans py-2 rounded-md hover:bg-surface-hover transition-all">
                    <FileText size={12} /> CSV
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
