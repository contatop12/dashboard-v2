import { useState, useMemo } from 'react'
import { WidthProvider, Responsive } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Settings2, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGridLayout } from '@/hooks/useGridLayout'
import DashboardBlock from '@/components/DashboardBlock'
import AddMetricModal from '@/components/AddMetricModal'
import GeralKpiCard from '@/components/GeralKpiCard'
import { formatFieldValue } from '@/lib/apiFields'
import { kpiData } from '@/data/mockData'

const ResponsiveGridLayout = WidthProvider(Responsive)

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }

function buildCustomDef(metric) {
  const rawValue = kpiData[metric.fieldKey]?.value ?? null
  const formatted = rawValue != null ? formatFieldValue(rawValue, metric.format) : '—'
  return {
    id: metric.id,
    tier: 'primary',
    render: () => (
      <GeralKpiCard
        label={metric.label}
        value={formatted}
        accent="brand"
      />
    ),
  }
}

export default function DashboardGrid({ pageId, definitions, className }) {
  const [isEditing, setIsEditing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const { layouts, customMetrics, onLayoutChange, addCustomMetric } = useGridLayout(
    pageId,
    definitions
  )

  const allDefinitions = useMemo(() => {
    const customDefs = customMetrics.map(buildCustomDef)
    return [...definitions, ...customDefs]
  }, [definitions, customMetrics])

  const existingCustomIds = useMemo(
    () => customMetrics.map((m) => m.id),
    [customMetrics]
  )

  return (
    <div className={cn('relative w-full dashboard-dot-bg min-h-screen', className)}>
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

      <ResponsiveGridLayout
        className="w-full"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={60}
        margin={[16, 16]}
        containerPadding={[24, 64]}
        draggableHandle=".widget-drag-handle"
        isDraggable={isEditing}
        isResizable={isEditing}
        onLayoutChange={onLayoutChange}
        resizeHandles={['se']}
      >
        {allDefinitions.map((def) => (
          <div key={def.id} className="group">
            <DashboardBlock blockId={def.id} isEditing={isEditing}>
              {def.render()}
            </DashboardBlock>
          </div>
        ))}
      </ResponsiveGridLayout>

      <AddMetricModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAdd={addCustomMetric}
        existingIds={existingCustomIds}
      />
    </div>
  )
}
