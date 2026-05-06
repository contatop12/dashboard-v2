import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useState } from 'react'
import { overviewTableData } from '@/data/mockData'
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'

const columns = [
  { key: 'campanha', label: 'Campanha', align: 'left' },
  { key: 'impressoes', label: 'Impressões', align: 'right', format: (v) => formatNumber(v) },
  { key: 'leads', label: 'Leads', align: 'right', format: (v) => v },
  { key: 'custoPorLead', label: 'Custo por Lead', align: 'right', format: (v) => formatCurrency(v) },
  { key: 'ctr', label: 'CTR', align: 'right', format: (v) => formatPercent(v) },
]

export default function OverviewTable() {
  const [sortKey, setSortKey] = useState('impressoes')
  const [sortDir, setSortDir] = useState('desc')

  const sorted = [...overviewTableData].sort((a, b) => {
    const mult = sortDir === 'desc' ? -1 : 1
    return (a[sortKey] > b[sortKey] ? 1 : -1) * mult
  })

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-lg border border-surface-border bg-surface-card p-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <span className="section-title">Visão Geral</span>
        <span className="text-[10px] text-muted-foreground font-mono">{overviewTableData.length} campanhas</span>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-0 max-w-full table-fixed text-xs">
          <thead>
            <tr className="border-b border-surface-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'pb-2 font-sans font-medium text-muted-foreground uppercase tracking-wider text-[10px] cursor-pointer hover:text-white transition-colors select-none',
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <div className={cn('flex min-w-0 items-center gap-1', col.align === 'right' && 'justify-end')}>
                    <span className="truncate">{col.label}</span>
                    {sortKey === col.key ? (
                      sortDir === 'desc' ? <ArrowDown size={10} className="text-brand" /> : <ArrowUp size={10} className="text-brand" />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={i}
                className="border-b border-surface-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'break-words py-2 font-mono',
                      col.align === 'right' ? 'text-right' : 'text-left',
                      col.key === 'campanha' ? 'truncate font-sans text-white' : 'text-white/90'
                    )}
                  >
                    {col.format ? col.format(row[col.key]) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
