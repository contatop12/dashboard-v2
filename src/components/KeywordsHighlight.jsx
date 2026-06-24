import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { keywordsData } from '@/data/mockData'
import { useDashboardFiltersOptional } from '@/context/DashboardFiltersContext'
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BlockCard } from '@/components/ui/BlockCard'

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

  const metricTabs = (
    <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-[#141414] p-1">
      {metrics.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setActiveMetric(m)}
          className={cn(
            'rounded-md px-2 py-1 text-[9px] font-medium font-sans transition-colors',
            activeMetric === m
              ? 'bg-brand/20 text-brand ring-1 ring-brand/30'
              : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white'
          )}
        >
          {m}
        </button>
      ))}
    </div>
  )

  return (
    <BlockCard
      title="Palavras-chave em destaque"
      badge={`${filtered.length} termos`}
      actions={metricTabs}
      bodyClassName="flex flex-col gap-3"
    >
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
    </BlockCard>
  )
}
