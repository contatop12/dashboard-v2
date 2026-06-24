import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { DimensionFilterSelect } from '@/components/ui/DimensionFilterSelect'
import { NameContainsFiltersPanel } from '@/components/ui/NameContainsFiltersPanel'
import { CampaignComplementaryFilters } from '@/components/ui/CampaignComplementaryFilters'
import { filterOptionsFromTree, hasActiveNameContainsFilters } from '@/lib/filterOptionsFromTree'
import { hasActiveCampaignBlockFilters } from '@/lib/campaignTreeSort'
import { META_OBJECTIVE_LABELS, META_STATUS_FILTER_OPTIONS } from '@/lib/metaAdsLabels'

export function MetaBlockFilterToolbar({ tree, blockFilters, setBlockFilters, className }) {
  const treeFilterOptions = useMemo(() => {
    const o = filterOptionsFromTree(tree, { objectiveLabels: META_OBJECTIVE_LABELS })
    return {
      objetivo: o.objetivo,
      status: META_STATUS_FILTER_OPTIONS,
    }
  }, [tree])

  const setBlockFilter = (key, opt) => setBlockFilters((prev) => ({ ...prev, [key]: opt }))

  const clearBlockFilter = (key) =>
    setBlockFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })

  const hasBlockFilters = hasActiveCampaignBlockFilters(blockFilters)

  const setNameContainsFilters = (filters) =>
    setBlockFilters((prev) => {
      const next = { ...prev }
      if (filters?.length) next.nameContainsFilters = filters
      else {
        delete next.nameContainsFilters
        delete next.nameContains
      }
      return next
    })

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <DimensionFilterSelect
          filterKey="objetivo"
          label="Tipo de conversão"
          value={blockFilters?.objetivo || null}
          options={treeFilterOptions.objetivo}
          onChange={setBlockFilter}
          onClear={clearBlockFilter}
          compact
        />
        <DimensionFilterSelect
          filterKey="status"
          label="Status"
          value={blockFilters?.status || null}
          options={treeFilterOptions.status}
          onChange={setBlockFilter}
          onClear={clearBlockFilter}
          compact
        />
        {hasBlockFilters ? (
          <button
            type="button"
            onClick={() => setBlockFilters({})}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:text-white"
          >
            <span aria-hidden>×</span> Limpar
          </button>
        ) : null}
      </div>

      <NameContainsFiltersPanel
        filters={
          blockFilters?.nameContainsFilters ??
          (hasActiveNameContainsFilters({ nameContains: blockFilters?.nameContains })
            ? [blockFilters.nameContains]
            : [])
        }
        onChange={setNameContainsFilters}
        childLevelLabel="Conjunto"
        compact
      />

      <CampaignComplementaryFilters
        blockFilters={blockFilters}
        setBlockFilters={setBlockFilters}
        compact
      />
    </div>
  )
}
