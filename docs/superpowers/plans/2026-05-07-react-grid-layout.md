# react-grid-layout Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom pointer-drag grid system with react-grid-layout, adding edit-mode toggle, dot-pattern background, draggableHandle, custom metric addition, and localStorage persistence.

**Architecture:** WidthProvider(Responsive) from react-grid-layout manages all block positions/sizes via a `layouts` object keyed by breakpoint. DashboardGrid holds `isEditing` state that gates `isDraggable`/`isResizable`. Custom primary KPI metrics are stored alongside the layout in localStorage.

**Tech Stack:** react-grid-layout, React 18, Vite, Tailwind CSS, Radix UI (Dialog for modal), lucide-react

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `package.json` | add react-grid-layout |
| Modify | `src/dashboard/geralBlocks.jsx` | add `tier:'primary'` + `defaultLayout` to each def |
| Rewrite | `src/hooks/useGridLayout.js` | RGL layouts format, localStorage, customMetrics |
| Create | `src/lib/apiFields.js` | predefined API field list for custom metric picker |
| Create | `src/components/AddMetricModal.jsx` | modal UI to pick and add a custom primary KPI |
| Rewrite | `src/components/DashboardGrid.jsx` | RGL grid, edit mode, dot bg, wire modal |
| Modify | `src/components/DashboardBlock.jsx` | add `.widget-drag-handle` grip, remove old drag/resize props |
| Delete | `src/hooks/useDragReorder.js` | replaced by RGL built-in drag |
| Modify | `src/index.css` | dashboard dot-pattern background class |

---

## Task 1: Install react-grid-layout

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install package**

```bash
npm install react-grid-layout
```

Expected output: added `react-grid-layout` and `react-resizable` to `node_modules`.

- [ ] **Step 2: Verify install**

```bash
node -e "require('./node_modules/react-grid-layout/package.json')" && echo OK
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-grid-layout"
```

---

## Task 2: Update geralBlocks.jsx — add tier + defaultLayout

**Files:**
- Modify: `src/dashboard/geralBlocks.jsx`

- [ ] **Step 1: Replace file contents**

```jsx
import GeralKpiCard, { GERAL_KPI_CARDS } from '@/components/GeralKpiCard'
import TimelineChart from '@/components/TimelineChart'
import OverviewTable from '@/components/OverviewTable'
import FunnelGeral from '@/components/FunnelGeral'
import Demographics from '@/components/Demographics'
import InvestimentoChart from '@/components/InvestimentoChart'
import VideoRange from '@/components/VideoRange'
import KeywordsHighlight from '@/components/KeywordsHighlight'

const KPI_BLOCK_DEFS = GERAL_KPI_CARDS.map((c) => ({
  id: `kpi-${c.id}`,
  tier: 'primary',
  defaultLayout: { w: 2, h: 2, minW: 1, maxW: 4, minH: 2, maxH: 4 },
  render: () => <GeralKpiCard {...c} />,
}))

export const GERAL_DASHBOARD_BLOCKS = [
  ...KPI_BLOCK_DEFS,
  {
    id: 'timeline',
    tier: 'secondary',
    defaultLayout: { w: 6, h: 4, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <TimelineChart />,
  },
  {
    id: 'funnel-geral',
    tier: 'secondary',
    defaultLayout: { w: 6, h: 4, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <FunnelGeral />,
  },
  {
    id: 'overview',
    tier: 'secondary',
    defaultLayout: { w: 6, h: 3, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <OverviewTable />,
  },
  {
    id: 'demographics',
    tier: 'secondary',
    defaultLayout: { w: 6, h: 3, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <Demographics />,
  },
  {
    id: 'investimento-chart',
    tier: 'secondary',
    defaultLayout: { w: 4, h: 3, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <InvestimentoChart />,
  },
  {
    id: 'video-range',
    tier: 'secondary',
    defaultLayout: { w: 4, h: 3, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <VideoRange />,
  },
  {
    id: 'keywords',
    tier: 'secondary',
    defaultLayout: { w: 4, h: 3, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <KeywordsHighlight />,
  },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/dashboard/geralBlocks.jsx
git commit -m "refactor: add tier + defaultLayout to dashboard block definitions"
```

---

## Task 3: Rewrite useGridLayout.js for RGL

**Files:**
- Rewrite: `src/hooks/useGridLayout.js`

The new hook manages `layouts` (RGL format) and `customMetrics`. It computes default positions for primary KPIs in a row at y=0, then secondary blocks stacked below.

- [ ] **Step 1: Replace file contents**

```js
import { useState, useCallback, useMemo } from 'react'

const STORAGE_PREFIX = 'dashboard-rgl-'

function storageKey(pageId) {
  return `${STORAGE_PREFIX}${pageId}`
}

function buildDefaultLgLayout(definitions) {
  const primary = definitions.filter((d) => d.tier === 'primary')
  const secondary = definitions.filter((d) => d.tier !== 'primary')

  const primaryItems = primary.map((d, i) => ({
    i: d.id,
    x: (i * (d.defaultLayout?.w ?? 2)) % 12,
    y: 0,
    w: d.defaultLayout?.w ?? 2,
    h: d.defaultLayout?.h ?? 2,
    minW: d.defaultLayout?.minW ?? 1,
    maxW: d.defaultLayout?.maxW ?? 12,
    minH: d.defaultLayout?.minH ?? 1,
    maxH: d.defaultLayout?.maxH ?? 12,
  }))

  const primaryRowH = primary.length > 0 ? (primary[0].defaultLayout?.h ?? 2) : 0

  let curX = 0
  let curY = primaryRowH
  const secondaryItems = secondary.map((d) => {
    const w = d.defaultLayout?.w ?? 6
    const h = d.defaultLayout?.h ?? 4
    if (curX + w > 12) {
      curX = 0
      curY += h
    }
    const item = {
      i: d.id,
      x: curX,
      y: curY,
      w,
      h,
      minW: d.defaultLayout?.minW ?? 2,
      maxW: d.defaultLayout?.maxW ?? 12,
      minH: d.defaultLayout?.minH ?? 1,
      maxH: d.defaultLayout?.maxH ?? 12,
    }
    curX += w
    if (curX >= 12) {
      curX = 0
      curY += h
    }
    return item
  })

  return [...primaryItems, ...secondaryItems]
}

function buildDefaultSmLayout(definitions) {
  return definitions.map((d, i) => ({
    i: d.id,
    x: 0,
    y: i * (d.defaultLayout?.h ?? 2),
    w: 6,
    h: d.defaultLayout?.h ?? 2,
    minW: 1,
    maxW: 6,
    minH: 1,
  }))
}

function buildDefaultLayouts(definitions) {
  return {
    lg: buildDefaultLgLayout(definitions),
    sm: buildDefaultSmLayout(definitions),
  }
}

function loadFromStorage(pageId, definitions) {
  try {
    const raw = localStorage.getItem(storageKey(pageId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveToStorage(pageId, data) {
  try {
    localStorage.setItem(storageKey(pageId), JSON.stringify(data))
  } catch { /* ignore */ }
}

function mergeLayouts(saved, defaults, allIds) {
  const idSet = new Set(allIds)
  const merged = {}
  for (const bp of Object.keys(defaults)) {
    const savedBp = Array.isArray(saved?.[bp]) ? saved[bp] : []
    const savedMap = Object.fromEntries(savedBp.map((item) => [item.i, item]))
    const defaultMap = Object.fromEntries(defaults[bp].map((item) => [item.i, item]))
    const items = allIds
      .filter((id) => defaultMap[id])
      .map((id) => ({ ...defaultMap[id], ...(savedMap[id] ?? {}) }))
    const extras = savedBp.filter((item) => !idSet.has(item.i))
    merged[bp] = [...items, ...extras]
  }
  return merged
}

export function useGridLayout(pageId, definitions) {
  const defaultLayouts = useMemo(() => buildDefaultLayouts(definitions), [definitions])
  const allIds = useMemo(() => definitions.map((d) => d.id), [definitions])

  const [state, setState] = useState(() => {
    const saved = loadFromStorage(pageId, definitions)
    return {
      layouts: mergeLayouts(saved?.layouts, defaultLayouts, allIds),
      customMetrics: Array.isArray(saved?.customMetrics) ? saved.customMetrics : [],
    }
  })

  const onLayoutChange = useCallback(
    (_currentLayout, allLayouts) => {
      setState((prev) => {
        const next = { ...prev, layouts: allLayouts }
        saveToStorage(pageId, next)
        return next
      })
    },
    [pageId]
  )

  const addCustomMetric = useCallback(
    (field) => {
      const id = `kpi-custom-${field.key}`
      setState((prev) => {
        if (prev.customMetrics.find((m) => m.id === id)) return prev
        const newMetric = { id, fieldKey: field.key, label: field.label, format: field.format }
        const newItem = { i: id, x: 0, y: 0, w: 2, h: 2, minW: 1, maxW: 4, minH: 2, maxH: 4 }
        const next = {
          ...prev,
          customMetrics: [...prev.customMetrics, newMetric],
          layouts: {
            ...prev.layouts,
            lg: [...(prev.layouts.lg ?? []), newItem],
            sm: [...(prev.layouts.sm ?? []), { ...newItem, w: 6, x: 0 }],
          },
        }
        saveToStorage(pageId, next)
        return next
      })
    },
    [pageId]
  )

  const removeCustomMetric = useCallback(
    (id) => {
      setState((prev) => {
        const next = {
          ...prev,
          customMetrics: prev.customMetrics.filter((m) => m.id !== id),
          layouts: Object.fromEntries(
            Object.entries(prev.layouts).map(([bp, items]) => [
              bp,
              items.filter((item) => item.i !== id),
            ])
          ),
        }
        saveToStorage(pageId, next)
        return next
      })
    },
    [pageId]
  )

  return {
    layouts: state.layouts,
    customMetrics: state.customMetrics,
    onLayoutChange,
    addCustomMetric,
    removeCustomMetric,
    defaultLayouts,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useGridLayout.js
git commit -m "refactor: rewrite useGridLayout for react-grid-layout format"
```

---

## Task 4: Create src/lib/apiFields.js

**Files:**
- Create: `src/lib/apiFields.js`

- [ ] **Step 1: Create file**

```js
export const API_FIELDS = [
  { key: 'impressoes', label: 'Impressões', format: 'number' },
  { key: 'alcance', label: 'Alcance', format: 'number' },
  { key: 'cliques', label: 'Cliques no Link', format: 'number' },
  { key: 'cpc', label: 'CPC', format: 'currency' },
  { key: 'frequencia', label: 'Frequência', format: 'decimal' },
  { key: 'conversoes', label: 'Conversões', format: 'number' },
  { key: 'leads', label: 'Leads', format: 'number' },
  { key: 'visualizacoes', label: 'Visualizações de Pág.', format: 'number' },
  { key: 'roas', label: 'ROAS', format: 'decimal' },
  { key: 'cpl', label: 'CPL', format: 'currency' },
]

/** Formats a raw numeric value according to format type. */
export function formatFieldValue(value, format) {
  if (value == null) return '—'
  switch (format) {
    case 'currency':
      return `R$${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case 'decimal':
      return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    default:
      return Number(value).toLocaleString('pt-BR')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/apiFields.js
git commit -m "feat: add API fields registry for custom KPI metric picker"
```

---

## Task 5: Create AddMetricModal.jsx

**Files:**
- Create: `src/components/AddMetricModal.jsx`

- [ ] **Step 1: Check Radix Dialog is installed**

```bash
node -e "require('./node_modules/@radix-ui/react-dialog/package.json')" && echo OK
```

Expected: `OK` (already in package.json)

- [ ] **Step 2: Create file**

```jsx
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { API_FIELDS } from '@/lib/apiFields'

export default function AddMetricModal({ open, onOpenChange, onAdd, existingIds }) {
  const [selected, setSelected] = useState(null)

  const available = API_FIELDS.filter((f) => !existingIds.includes(`kpi-custom-${f.key}`))

  function handleConfirm() {
    if (!selected) return
    onAdd(selected)
    setSelected(null)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-surface-card p-6 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              Adicionar métrica
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
            {available.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Todas as métricas disponíveis já foram adicionadas.
              </p>
            )}
            {available.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => setSelected(field)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors',
                  selected?.key === field.key
                    ? 'bg-brand/20 text-brand'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                <span className="flex-1">{field.label}</span>
                {selected?.key === field.key && <Plus size={12} />}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selected}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                selected
                  ? 'bg-brand text-black hover:bg-brand/90'
                  : 'bg-white/10 text-muted-foreground cursor-not-allowed'
              )}
            >
              Adicionar
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AddMetricModal.jsx
git commit -m "feat: add AddMetricModal for custom primary KPI selection"
```

---

## Task 6: Add dot-pattern background CSS

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add class at the end of src/index.css**

Append after all existing rules:

```css
.dashboard-dot-bg {
  background-image: radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: add dashboard dot-pattern background utility class"
```

---

## Task 7: Simplify DashboardBlock.jsx

Remove all custom drag/resize logic. Add `.widget-drag-handle` grip icon shown only in edit mode.

**Files:**
- Rewrite: `src/components/DashboardBlock.jsx`

- [ ] **Step 1: Replace file contents**

```jsx
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardBlock({ blockId, isEditing, children }) {
  return (
    <div
      data-block-id={blockId}
      className="relative flex min-w-0 flex-col h-full w-full"
    >
      {isEditing && (
        <div
          className={cn(
            'widget-drag-handle absolute left-2 top-2 z-40',
            'flex h-7 w-7 cursor-grab items-center justify-center',
            'rounded-md bg-black/40 text-muted-foreground/70',
            'opacity-0 transition-opacity group-hover:opacity-100',
            'hover:bg-black/60 hover:text-foreground active:cursor-grabbing'
          )}
          title="Arrastar para reordenar"
        >
          <GripVertical size={13} />
        </div>
      )}
      <div className="relative flex min-w-0 flex-col h-full w-full overflow-hidden">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DashboardBlock.jsx
git commit -m "refactor: simplify DashboardBlock — remove custom drag/resize, add widget-drag-handle"
```

---

## Task 8: Rewrite DashboardGrid.jsx

**Files:**
- Rewrite: `src/components/DashboardGrid.jsx`

DashboardGrid is now the core of the RGL integration. It:
1. Imports RGL and its CSS
2. Builds `allDefinitions` = static definitions + custom metric definitions
3. Renders `ResponsiveGridLayout` with edit mode gating drag/resize
4. Shows edit toggle button + "add metric" button in edit mode
5. Applies dot-pattern background

- [ ] **Step 1: Replace file contents**

```jsx
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
import { API_FIELDS, formatFieldValue } from '@/lib/apiFields'
import { kpiData } from '@/data/mockData'

const ResponsiveGridLayout = WidthProvider(Responsive)

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }

function buildCustomDef(metric) {
  const field = API_FIELDS.find((f) => f.key === metric.fieldKey)
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

  const catalog = useMemo(
    () => Object.fromEntries(allDefinitions.map((d) => [d.id, d])),
    [allDefinitions]
  )

  const existingCustomIds = useMemo(
    () => customMetrics.map((m) => m.id),
    [customMetrics]
  )

  return (
    <div className={cn('relative w-full dashboard-dot-bg', className)}>
      {/* Edit mode toolbar */}
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
        className={cn('w-full', isEditing && 'rgl-editing')}
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={60}
        margin={[16, 16]}
        containerPadding={[24, 56]}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DashboardGrid.jsx
git commit -m "feat: replace custom grid with react-grid-layout + edit mode + custom metrics"
```

---

## Task 9: Delete useDragReorder.js

**Files:**
- Delete: `src/hooks/useDragReorder.js`

- [ ] **Step 1: Delete file**

```bash
git rm src/hooks/useDragReorder.js
```

- [ ] **Step 2: Verify no remaining imports**

```bash
grep -r "useDragReorder" src/
```

Expected: no output (no remaining references).

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove useDragReorder — replaced by react-grid-layout"
```

---

## Task 10: Visual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open browser at localhost:5173**

Verify:
- Dashboard loads with dot-pattern background
- All 6 KPI cards visible in top row (2 cols each, 12 total)
- Charts/tables below KPIs
- "Editar layout" button visible top-right
- Clicking "Editar layout" → button turns brand color + grip icons appear on hover
- Dragging via grip icon reorders blocks
- Resizing via bottom-right corner handle works
- "Métrica" button appears in edit mode
- Clicking "Métrica" → modal opens with field list
- Selecting a field + "Adicionar" → new KPI card appears in grid
- Reloading page → layout persists from localStorage

- [ ] **Step 3: Check browser console for errors**

Expected: no errors.

- [ ] **Step 4: Final commit if any fixes applied**

```bash
git add -p
git commit -m "fix: visual corrections after react-grid-layout integration"
```
