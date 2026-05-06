import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { normalizeLayout, buildGridTemplateColumns } from '@/lib/dashboardGrid'
import { useGridLayout } from '@/hooks/useGridLayout'
import { useDragReorder } from '@/hooks/useDragReorder'
import DashboardBlock from '@/components/DashboardBlock'
import { cn } from '@/lib/utils'

/** Segmenta a ordem: blocos `kpi-*` consecutivos compartilham uma linha interna de 8 colunas. */
function groupOrderForKpiStrip(order) {
  const segments = []
  let i = 0
  while (i < order.length) {
    const id = order[i]
    if (id && /^kpi-/i.test(String(id))) {
      const ids = []
      while (i < order.length && order[i] && /^kpi-/i.test(String(order[i]))) {
        ids.push(order[i])
        i++
      }
      segments.push({ type: 'kpi-strip', ids })
    } else {
      segments.push({ type: 'item', id })
      i++
    }
  }
  return segments
}

export default function DashboardGrid({ pageId, definitions, className }) {
  const { theme } = useTheme()
  const L = normalizeLayout(theme.layout)
  const cols = buildGridTemplateColumns(L.columnWeights, L.cellMinWidthPx)

  const { order, spans, setOrder, resizeBlock } = useGridLayout(pageId, definitions)
  const drag = useDragReorder(order, setOrder)

  const [isLg, setIsLg] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  const [colUnit, setColUnit] = useState(100)

  const segments = useMemo(() => groupOrderForKpiStrip(order), [order])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const fn = () => setIsLg(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  useEffect(() => {
    const el = drag.containerRef.current
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
  }, [isLg, L.marginLeft, L.marginRight, L.gapX, drag.containerRef])

  const rowStride = L.cellHeightPx + L.gapY

  const catalog = useMemo(() => Object.fromEntries(definitions.map((d) => [d.id, d])), [definitions])

  const padStyle = {
    paddingTop: L.marginTop,
    paddingRight: L.marginRight,
    paddingBottom: L.marginBottom,
    paddingLeft: L.marginLeft,
  }

  function renderBlock(id) {
    const def = catalog[id]
    if (!def) return null
    const span = spans[id] || { colSpan: 1, rowSpan: 1 }

    return (
      <DashboardBlock
        key={id}
        blockId={id}
        colSpan={span.colSpan}
        rowSpan={span.rowSpan}
        minColSpan={def.minColSpan}
        maxColSpan={def.maxColSpan}
        minRowSpan={def.minRowSpan}
        maxRowSpan={def.maxRowSpan}
        colUnit={colUnit}
        rowStride={rowStride}
        isLg={isLg}
        draggingId={drag.draggingId}
        overId={drag.overId}
        onDragHandlePointerDown={drag.handlePointerDown}
        onResizeCommit={resizeBlock}
      >
        {def.render()}
      </DashboardBlock>
    )
  }

  const stripInnerGap = { columnGap: L.gapX, rowGap: L.gapY }

  return (
    <div
      ref={drag.containerRef}
      data-dashboard-grid
      className={cn(
        'dashboard-area-bg animate-fade-in relative z-0 w-full min-h-0 min-w-0 max-w-full box-border overflow-x-hidden',
        isLg && 'grid grid-flow-row-dense items-start dashboard-grid-masonry',
        !isLg && 'flex flex-col',
        L.showGridOverlay && isLg && 'ring-1 ring-inset ring-brand/15',
        className
      )}
      style={
        isLg
          ? {
              gridTemplateColumns: cols,
              gridAutoRows: `minmax(${L.cellHeightPx}px, auto)`,
              columnGap: L.gapX,
              rowGap: L.gapY,
              ...padStyle,
            }
          : {
              gap: L.gapY,
              ...padStyle,
            }
      }
    >
      {segments.map((seg, segIdx) => {
        if (seg.type === 'kpi-strip') {
          const stripKey = `kpi-strip-${seg.ids.join('|')}-${segIdx}`
          if (!isLg) {
            return (
              <div key={stripKey} className="relative z-[1] flex w-full flex-col gap-4">
                {seg.ids.map((id) => renderBlock(id))}
              </div>
            )
          }
          return (
            <div key={stripKey} className="relative z-[1] min-h-0 min-w-0 [grid-column:1/-1]">
              <div className="grid min-h-0 w-full grid-cols-8" style={stripInnerGap}>
                {seg.ids.map((id) => renderBlock(id))}
              </div>
            </div>
          )
        }

        return renderBlock(seg.id)
      })}
    </div>
  )
}
