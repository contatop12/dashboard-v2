import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import DashboardBlock from '@/components/DashboardBlock'
import { DashboardBlockPeriodContext } from '@/context/DashboardBlockPeriodContext'
import { useDashboardFiltersOptional } from '@/context/DashboardFiltersContext'
import { inferGridColumnCount, blockGridStyle } from '@/lib/staticBlockLayout'

export default function DashboardGrid({ definitions, className }) {
  const filters = useDashboardFiltersOptional()
  const comparePrimaryKpi = filters?.comparePrimaryKpi ?? false

  const gridCols = useMemo(() => inferGridColumnCount(definitions), [definitions])

  const primaryDefs = useMemo(
    () => definitions.filter((d) => d.tier === 'primary'),
    [definitions]
  )
  const secondaryDefs = useMemo(
    () => definitions.filter((d) => d.tier !== 'primary'),
    [definitions]
  )

  const gridStyle = useMemo(
    () => ({ '--grid-cols': String(gridCols) }),
    [gridCols]
  )

  return (
    <div className={cn('relative w-full min-h-full', className)}>
      {primaryDefs.length > 0 && (
        <section className="px-6 pt-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Métricas</span>
            {comparePrimaryKpi && (
              <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                Comparando
              </span>
            )}
          </div>

          <div className="dashboard-static-grid" style={gridStyle}>
            {primaryDefs.map((def) => (
              <DashboardBlock
                key={def.id}
                blockId={def.id}
                className="dashboard-block-item"
                style={blockGridStyle(def, 'primary', gridCols)}
              >
                {def.render()}
              </DashboardBlock>
            ))}
          </div>

          {comparePrimaryKpi && (
            <div className="mt-4">
              <p className="mb-3 text-xs text-muted-foreground">Período anterior</p>
              <DashboardBlockPeriodContext.Provider value="previous">
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(primaryDefs.length, gridCols)}, minmax(0, 1fr))`,
                  }}
                >
                  {primaryDefs.map((def) => (
                    <div key={`cmp-${def.id}`}>{def.render()}</div>
                  ))}
                </div>
              </DashboardBlockPeriodContext.Provider>
            </div>
          )}
        </section>
      )}

      {secondaryDefs.length > 0 && (
        <section className={cn('px-6 pb-6', primaryDefs.length > 0 && 'pt-8')}>
          {primaryDefs.length > 0 && (
            <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Análise detalhada
            </h2>
          )}
          <div className="dashboard-static-grid" style={gridStyle}>
            {secondaryDefs.map((def) => (
              <DashboardBlock
                key={def.id}
                blockId={def.id}
                className="dashboard-block-item"
                style={blockGridStyle(def, 'secondary', gridCols)}
              >
                {def.render()}
              </DashboardBlock>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
