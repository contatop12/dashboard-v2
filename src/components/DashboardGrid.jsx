import { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

  const compareRangeLabel = useMemo(() => {
    const r = filters?.compareDateRange
    if (!r?.start || !r?.end) return null
    return `${format(r.start, 'd MMM', { locale: ptBR })} – ${format(r.end, 'd MMM yyyy', { locale: ptBR })}`
  }, [filters?.compareDateRange])

  const primaryRangeLabel = useMemo(() => {
    const r = filters?.dateRange
    if (!r?.start || !r?.end) return null
    return `${format(r.start, 'd MMM', { locale: ptBR })} – ${format(r.end, 'd MMM yyyy', { locale: ptBR })}`
  }, [filters?.dateRange])

  const gridStyle = useMemo(
    () => ({ '--grid-cols': String(gridCols) }),
    [gridCols]
  )

  return (
    <div className={cn('relative w-full min-h-full', className)}>
      {primaryDefs.length > 0 && (
        <section className="px-6 pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Métricas</span>
            {primaryRangeLabel ? (
              <span className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground/80">
                {primaryRangeLabel}
              </span>
            ) : null}
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
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground">Período anterior</p>
                {compareRangeLabel ? (
                  <span className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground/85">
                    {compareRangeLabel}
                  </span>
                ) : null}
              </div>
              <DashboardBlockPeriodContext.Provider value="previous">
                {/* Espelha a grade principal: mesmos col-spans/stacking,
                    para o período anterior refletir o layout do principal
                    em vez de espremer os blocos lado a lado. */}
                <div className="dashboard-static-grid" style={gridStyle}>
                  {primaryDefs.map((def) => (
                    <DashboardBlock
                      key={`cmp-${def.id}`}
                      blockId={`cmp-${def.id}`}
                      className="dashboard-block-item"
                      style={blockGridStyle(def, 'primary', gridCols)}
                    >
                      {def.render()}
                    </DashboardBlock>
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
