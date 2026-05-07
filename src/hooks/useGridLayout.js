import { useState, useCallback, useMemo } from 'react'

const STORAGE_PREFIX = 'dashboard-rgl-'

function storageKey(pageId) {
  return `${STORAGE_PREFIX}${pageId}`
}

function buildDefaultLgLayout(definitions) {
  const primary = definitions.filter((d) => d.tier === 'primary')
  const secondary = definitions.filter((d) => d.tier !== 'primary')

  const primaryRowH = primary.length > 0 ? (primary[0].defaultLayout?.h ?? 2) : 0
  let curX = 0
  const primaryItems = primary.map((d) => {
    const w = d.defaultLayout?.w ?? 2
    const item = {
      i: d.id,
      x: curX,
      y: 0,
      w,
      h: d.defaultLayout?.h ?? 2,
      minW: d.defaultLayout?.minW ?? 1,
      maxW: d.defaultLayout?.maxW ?? 12,
      minH: d.defaultLayout?.minH ?? 1,
      maxH: d.defaultLayout?.maxH ?? 12,
    }
    curX += w
    return item
  })

  let secX = 0
  let secY = primaryRowH
  const secondaryItems = secondary.map((d) => {
    const w = d.defaultLayout?.w ?? 6
    const h = d.defaultLayout?.h ?? 4
    if (secX + w > 12) {
      secX = 0
      secY += h
    }
    const item = {
      i: d.id,
      x: secX,
      y: secY,
      w,
      h,
      minW: d.defaultLayout?.minW ?? 2,
      maxW: d.defaultLayout?.maxW ?? 12,
      minH: d.defaultLayout?.minH ?? 1,
      maxH: d.defaultLayout?.maxH ?? 12,
    }
    secX += w
    if (secX >= 12) {
      secX = 0
      secY += h
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

function loadFromStorage(pageId) {
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
    const saved = loadFromStorage(pageId)
    return {
      layouts: mergeLayouts(saved?.layouts, buildDefaultLayouts(definitions), definitions.map((d) => d.id)),
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
