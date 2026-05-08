import { useState, useMemo } from 'react'
import { WidthProvider, Responsive } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Settings2, Plus, Check, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGridLayout } from '@/hooks/useGridLayout'
import DashboardBlock from '@/components/DashboardBlock'
import AddMetricModal from '@/components/AddMetricModal'
import GeralKpiCard from '@/components/GeralKpiCard'
import { formatFieldValue } from '@/lib/apiFields'
import { kpiData } from '@/data/mockData'
import { DashboardBlockPeriodContext } from '@/context/DashboardBlockPeriodContext'
import { useDashboardFiltersOptional } from '@/context/DashboardFiltersContext'

const ResponsiveGridLayout = WidthProvider(Responsive)

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }

function buildCustomDef(metric) {
  const rawValue = kpiData[metric.fieldKey]?.value ?? null
  const formatted = rawValue != null ? formatFieldValue(rawValue, metric.format) : '—'
  return {
    id: metric.id,
    tier: 'primary',
    render: () => <GeralKpiCard label={metric.label} value={formatted} accent="brand" />,
  }
}

const RGL_PROPS = {
  breakpoints: BREAKPOINTS,
  cols: COLS,
  rowHeight: 60,
  margin: [16, 16],
  draggableHandle: '.widget-drag-handle',
  resizeHandles: ['se'],
}

export default function DashboardGrid({ pageId, definitions, className }) {
  const [isEditing, setIsEditing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const filters = useDashboardFiltersOptional()
  const comparePrimaryKpi = filters?.comparePrimaryKpi ?? false

  const {
    primaryLayouts,
    secondaryLayouts,
    customMetrics,
    onPrimaryLayoutChange,
    onSecondaryLayoutChange,
    addCustomMetric,
  } = useGridLayout(pageId, definitions)

  const primaryDefs = useMemo(
    () => definitions.filter((d) => d.tier === 'primary'),
    [definitions]
  )
  const secondaryDefs = useMemo(
    () => definitions.filter((d) => d.tier !== 'primary'),
    [definitions]
  )

  const allPrimaryDefs = useMemo(() => {
    const customDefs = customMetrics.map(buildCustomDef)
    return [...primaryDefs, ...customDefs]
  }, [primaryDefs, customMetrics])

  const existingCustomIds = useMemo(
    () => customMetrics.map((m) => m.id),
    [customMetrics]
  )

  return (
    <div className={cn('relative w-full dashboard-dot-bg min-h-screen', className)}>
      {/* Toolbar */}
      <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
        {isEditing && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-surface-card border border-white/10 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shadow"
          >
            <Plus size={12} />
            Métrica
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsEditing((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow',
            isEditing
              ? 'bg-brand text-black hover:bg-brand/90'
              : 'bg-surface-card border border-white/10 text-muted-foreground hover:text-foreground'
          )}
        >
          {isEditing ? <Check size={12} /> : <Settings2 size={12} />}
          {isEditing ? 'Concluir' : 'Editar layout'}
        </button>
      </div>

      {/* Primary KPI section */}
      <div className="pt-14 px-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 font-display">
            KPIs Principais
          </span>
          {comparePrimaryKpi && (
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand">
              Comparando
            </span>
          )}
        </div>

        <ResponsiveGridLayout
          {...RGL_PROPS}
          className="w-full"
          layouts={primaryLayouts}
          containerPadding={[0, 8]}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={onPrimaryLayoutChange}
        >
          {allPrimaryDefs.map((def) => (
            <div key={def.id} className="group">
              <DashboardBlock blockId={def.id} isEditing={isEditing}>
                {def.render()}
              </DashboardBlock>
            </div>
          ))}
        </ResponsiveGridLayout>

        {/* Comparison strip */}
        {comparePrimaryKpi && (
          <div className="mt-2 pb-2">
            <p className="kpi-compare-strip-title">Período anterior</p>
            <DashboardBlockPeriodContext.Provider value="previous">
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(allPrimaryDefs.length, 6)}, minmax(0, 1fr))` }}
              >
                {allPrimaryDefs.map((def) => (
                  <div key={`cmp-${def.id}`}>
                    {def.render()}
                  </div>
                ))}
              </div>
            </DashboardBlockPeriodContext.Provider>
          </div>
        )}
      </div>

      {/* Section separator */}
      <div className="mx-6 my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 font-display">
          <BarChart2 size={11} className="opacity-60" />
          Análise
        </div>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      {/* Secondary blocks section */}
      <div className="px-6 pb-6">
        <ResponsiveGridLayout
          {...RGL_PROPS}
          className="w-full"
          layouts={secondaryLayouts}
          containerPadding={[0, 0]}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={onSecondaryLayoutChange}
        >
          {secondaryDefs.map((def) => (
            <div key={def.id} className="group">
              <DashboardBlock blockId={def.id} isEditing={isEditing}>
                {def.render()}
              </DashboardBlock>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      <AddMetricModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAdd={addCustomMetric}
        existingIds={existingCustomIds}
      />
    </div>
  )
}
