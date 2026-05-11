import { useMemo, useState } from 'react'
import { Search, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react'
import { keywordsData } from '@/data/mockData'
import { useDashboardFiltersOptional } from '@/context/DashboardFiltersContext'
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'

const metrics = ['Impressões', 'CTR', 'CPC']

export default function KeywordsHighlight() {
  const filters = useDashboardFiltersOptional()
  const palavraBarra = filters?.dimensionFilters?.palavrasChave
  const [activeMetric, setActiveMetric] = useState('CTR')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return keywordsData.filter((k) => {
      if (!k.keyword.toLowerCase().includes(search.toLowerCase())) return false
      if (!palavraBarra || palavraBarra === 'Todas') return true
      return k.keyword.toLowerCase().includes(palavraBarra.toLowerCase())
    })
  }, [search, palavraBarra])

  const getMetricValue = (kw) => {
    if (activeMetric === 'Impressões') return formatNumber(kw.impressoes)
    if (activeMetric === 'CTR') return formatPercent(kw.ctr)
    if (activeMetric === 'CPC') return formatCurrency(kw.cpc)
    return ''
  }

  const getBarWidth = (kw) => {
    if (activeMetric === 'Impressões') return (kw.impressoes / 8420) * 100
    if (activeMetric === 'CTR') return (kw.ctr / 4.5) * 100
    if (activeMetric === 'CPC') return (kw.cpc / 5) * 100
    return 50
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-lg border border-surface-border bg-surface-card p-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <span className="section-title">Palavras-Chave Destaque</span>
        <div className="flex items-center gap-2">
          {metrics.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              className={cn(
                'text-[10px] px-2 py-1 rounded font-mono transition-all',
                activeMetric === m
                  ? 'bg-brand text-[#0F0F0F] font-semibold'
                  : 'text-muted-foreground hover:text-white'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="relative shrink-0">
        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar palavra-chave..."
          className="w-full bg-surface-input border border-surface-border rounded-md pl-8 pr-4 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-brand/50 transition-colors font-sans"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {filtered.map((kw, i) => (
          <div key={kw.keyword} className="group flex items-center gap-2 py-2">
            <span className="font-mono text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-sans text-white truncate">{kw.keyword}</span>
                <span className="font-mono text-[11px] text-brand shrink-0 ml-2">{getMetricValue(kw)}</span>
              </div>
              <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand/70 rounded-full transition-all duration-500"
                  style={{ width: `${getBarWidth(kw)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
