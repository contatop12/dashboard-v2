import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTheme } from '@/context/ThemeContext'
import { useDashboardFiltersOptional } from '@/context/DashboardFiltersContext'
import { DashboardBlockPeriodContext } from '@/context/DashboardBlockPeriodContext'
import { normalizeLayout, buildGridTemplateColumns } from '@/lib/dashboardGrid'
import { useGridLayout } from '@/hooks/useGridLayout'
import { useDragReorder } from '@/hooks/useDragReorder'
import DashboardBlock from '@/components/DashboardBlock'
import { cn } from '@/lib/utils'

function formatRangePt(start, end) {
  const sameYear = start.getFullYear() === end.getFullYear()
  const a = format(start, sameYear ? "d MMM" : "d MMM yyyy", { locale: ptBR })
  const b = format(end, 'd MMM yyyy', { locale: ptBR })
  return `${a} – ${b}`
}

export default function DashboardGrid({ pageId, definitions, className }) {
  const { theme } = useTheme()
  const dashFilters = useDashboardFiltersOptional()
  const comparePrimaryKpi = dashFilters?.comparePrimaryKpi ?? false
  const previousPeriod = dashFilters?.previousPeriod

  const L = normalizeLayout(theme.layout)
  const cols = buildGridTemplateColumns(L.columnWeights, L.cellMinWidthPx)

  const { primaryOrder, secondaryOrder, spans, setPrimaryOrder, setSecondaryOrder, resizeBlock } = useGridLayout(pageId, definitions)
  const dragPrimary = useDragReorder(primaryOrder, setPrimaryOrder)
  const dragSecondary = useDragReorder(secondaryOrder, setSecondaryOrder)

  const [isLg, setIsLg] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  const [colUnit, setColUnit] = useState(100)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const fn = () => setIsLg(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  useEffect(() => {
    const el = dragPrimary.containerRef.current
    if (!el || !isLg) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const inner = Math.max(0, r.width - L.marginLeft - L.marginRight)
      const g = L.gapX
      const u = (inner - 7 * g) / 8
      setColUnit(Math.max(48, u))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isLg, L.marginLeft, L.marginRight, L.gapX, dragPrimary.containerRef])

  const rowStride = L.cellHeightPx + L.gapY

  const catalog = useMemo(() => Object.fromEntries(definitions.map((d) => [d.id, d])), [definitions])

  const padStyle = {
    paddingTop: L.marginTop,
    paddingRight: L.marginRight,
    paddingBottom: L.marginBottom,
    paddingLeft: L.marginLeft,
  }

  function renderPrimaryBlock(id) {
    const def = catalog[id]
    if (!def) return null
    const span = spans[id] || { colSpan: 1, rowSpan: 1 }

    return (
      <DashboardBlock
        key={id}
        blockId={id}
        isPrimaryKpi
        colSpan={span.colSpan}
        rowSpan={span.rowSpan}
        minColSpan={def.minColSpan}
        maxColSpan={def.maxColSpan}
        minRowSpan={def.minRowSpan}
        maxRowSpan={def.maxRowSpan}
        colUnit={colUnit}
        rowStride={rowStride}
        isLg={isLg}
        draggingId={dragPrimary.draggingId}
        overId={dragPrimary.overId}
        onDragHandlePointerDown={dragPrimary.handlePointerDown}
        onResizeCommit={resizeBlock}
      >
        {def.render()}
      </DashboardBlock>
    )
  }

  function renderSecondaryBlock(id) {
    const def = catalog[id]
    if (!def) return null
    const span = spans[id] || { colSpan: 1, rowSpan: 1 }

    return (
      <DashboardBlock
        key={id}
        blockId={id}
        isPrimaryKpi={false}
        colSpan={span.colSpan}
        rowSpan={span.rowSpan}
        minColSpan={def.minColSpan}
        maxColSpan={def.maxColSpan}
        minRowSpan={def.minRowSpan}
        maxRowSpan={def.maxRowSpan}
        colUnit={colUnit}
        rowStride={rowStride}
        isLg={isLg}
        draggingId={dragSecondary.draggingId}
        overId={dragSecondary.overId}
        onDragHandlePointerDown={dragSecondary.handlePointerDown}
        onResizeCommit={resizeBlock}
      >
        {def.render()}
      </DashboardBlock>
    )
  }

  const stripInnerGap = { columnGap: L.gapX, rowGap: L.gapY }

  const previousLabel =
    previousPeriod?.start && previousPeriod?.end
      ? formatRangePt(previousPeriod.start, previousPeriod.end)
      : ''

  const secondaryGridClass = cn(
    isLg && 'grid grid-flow-row-dense items-start dashboard-grid-masonry',
    !isLg && 'flex flex-col',
    L.showGridOverlay && isLg && 'ring-1 ring-inset ring-brand/15'
  )

  const secondaryGridStyle = isLg
    ? {
        gridTemplateColumns: cols,
        gridAutoRows: `minmax(${L.cellHeightPx}px, auto)`,
        columnGap: L.gapX,
        rowGap: L.gapY,
      }
    : { gap: L.gapY }

  return (
    <div
      data-dashboard-grid
      className={cn(
        'dashboard-area-bg animate-fade-in relative z-0 w-full min-h-0 min-w-0 max-w-full box-border overflow-x-hidden flex flex-col',
        className
      )}
      style={padStyle}
    >
      <div ref={dragPrimary.containerRef} className="relative z-[1] w-full min-w-0 shrink-0">
        {!isLg ? (
          <div className="relative flex w-full flex-col gap-4">
            {primaryOrder.map((id) => renderPrimaryBlock(id))}
          </div>
        ) : (
          <div className="relative min-h-0 min-w-0 w-full">
            <div className="grid min-h-0 w-full grid-cols-8" style={stripInnerGap}>
              {primaryOrder.map((id) => renderPrimaryBlock(id))}
            </div>
          </div>
        )}

        {comparePrimaryKpi && previousLabel ? (
          <div className={cn('mt-3 w-full min-w-0', isLg && 'mt-4')}>
            <p className="mb-2 text-[10px] font-sans uppercase tracking-wider text-muted-foreground">
              Período anterior · {previousLabel}
            </p>
            {!isLg ? (
              <div className="flex w-full flex-col gap-4">
                {primaryOrder.map((id) => {
                  const def = catalog[id]
                  if (!def) return null
                  return (
                    <DashboardBlockPeriodContext.Provider key={`${id}-cmp`} value="previous">
                      <div className="kpi-card min-w-0 w-full shrink-0">{def.render()}</div>
                    </DashboardBlockPeriodContext.Provider>
                  )
                })}
              </div>
            ) : (
              <div className="grid min-h-0 w-full grid-cols-8 opacity-95" style={stripInnerGap}>
                {primaryOrder.map((id) => {
                  const def = catalog[id]
                  if (!def) return null
                  return (
                    <DashboardBlockPeriodContext.Provider key={`${id}-cmp`} value="previous">
                      <div className="kpi-card min-w-0 w-full shrink-0">{def.render()}</div>
                    </DashboardBlockPeriodContext.Provider>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div
        ref={dragSecondary.containerRef}
        className={cn('relative z-0 w-full min-h-0 min-w-0 flex-1', secondaryGridClass, isLg ? 'mt-4' : 'mt-4')}
        style={secondaryGridStyle}
      >
        {secondaryOrder.map((id) => renderSecondaryBlock(id))}
      </div>
    </div>
  )
}
