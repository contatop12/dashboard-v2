import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { DimensionFilterSelect } from '@/components/ui/DimensionFilterSelect'
import { filterOptionsFromTree } from '@/lib/filterOptionsFromTree'
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

  const hasBlockFilters = Boolean(blockFilters?.objetivo || blockFilters?.status)

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
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
  )
}
