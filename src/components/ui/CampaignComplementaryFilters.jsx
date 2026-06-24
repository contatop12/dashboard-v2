import { cn } from '@/lib/utils'
import {
  CAMPAIGN_VIEW_FILTER_CHIPS,
  TOP_SPEND_FILTER_OPTIONS,
} from '@/lib/campaignTreeSort'

/**
 * Filtros complementares: métricas mínimas e top investimento.
 */
export function CampaignComplementaryFilters({ blockFilters, setBlockFilters, compact = false }) {
  const toggleViewFilter = (key) => setBlockFilters((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.04] pt-2">
      <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Exibir
      </span>
      {CAMPAIGN_VIEW_FILTER_CHIPS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => toggleViewFilter(key)}
          className={cn(
            'filter-select text-[11px]',
            compact ? 'h-7' : 'h-8',
            blockFilters[key] && 'border-brand/40 bg-brand/10 text-brand'
          )}
          aria-pressed={Boolean(blockFilters[key])}
        >
          {label}
        </button>
      ))}
      <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
      <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Investimento
      </span>
      <select
        value={blockFilters.topSpendCount ?? ''}
        onChange={(e) =>
          setBlockFilters((prev) => {
            const next = { ...prev }
            const v = e.target.value
            if (v) next.topSpendCount = v
            else delete next.topSpendCount
            return next
          })
        }
        className={cn(
          'filter-select cursor-pointer text-[11px]',
          compact ? 'h-7 max-w-[150px]' : 'h-8 max-w-[170px]',
          blockFilters.topSpendCount && 'border-brand/40 bg-brand/10 text-brand'
        )}
        aria-label="Filtrar por maior investimento"
      >
        {TOP_SPEND_FILTER_OPTIONS.map((o) => (
          <option key={o.id || 'all'} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
