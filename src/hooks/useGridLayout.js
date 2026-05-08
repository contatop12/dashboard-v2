import { useState, useCallback, useMemo } from 'react'

const STORAGE_PREFIX = 'dashboard-rgl2-'

function storageKey(pageId) {
  return `${STORAGE_PREFIX}${pageId}`
}

function buildPrimaryLg(defs) {
  let curX = 0
  return defs.map((d) => {
    const w = d.defaultLayout?.w ?? 2
    const h = d.defaultLayout?.h ?? 2
    if (curX + w > 12) curX = 0
    const item = {
      i: d.id,
      x: curX,
      y: 0,
      w,
      h,
      minW: d.defaultLayout?.minW ?? 1,
      maxW: d.defaultLayout?.maxW ?? 6,
      minH: d.defaultLayout?.minH ?? 1,
      maxH: d.defaultLayout?.maxH ?? 4,
    }
    curX += w
    return item
  })
}

function buildPrimaryLayouts(defs) {
  const lg = buildPrimaryLg(defs)
  const sm = defs.map((d, i) => ({
    i: d.id,
    x: i % 2 === 0 ? 0 : 3,
    y: Math.floor(i / 2) * (d.defaultLayout?.h ?? 2),
    w: 3,
    h: d.defaultLayout?.h ?? 2,
    minW: 1,
    maxW: 6,
    minH: 1,
  }))
  return { lg, sm }
}

function buildSecondaryLg(defs) {
  let curX = 0
  let curY = 0
  return defs.map((d) => {
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
      minH: d.defaultLayout?.minH ?? 2,
      maxH: d.defaultLayout?.maxH ?? 12,
    }
    curX += w
    if (curX >= 12) {
      curX = 0
      curY += h
    }
    return item
  })
}

function buildSecondaryLayouts(defs) {
  const lg = buildSecondaryLg(defs)
  const sm = defs.map((d, i) => ({
    i: d.id,
    x: 0,
    y: i * (d.defaultLayout?.h ?? 4),
    w: 6,
    h: d.defaultLayout?.h ?? 4,
    minW: 1,
    maxW: 6,
    minH: 2,
  }))
  return { lg, sm }
}

function mergeLayouts(saved, defaults, ids) {
  const idSet = new Set(ids)
  const merged = {}
  for (const bp of Object.keys(defaults)) {
    const savedBp = Array.isArray(saved?.[bp]) ? saved[bp] : []
    const savedMap = Object.fromEntries(savedBp.map((item) => [item.i, item]))
    const defaultMap = Object.fromEntries(defaults[bp].map((item) => [item.i, item]))
    const items = ids
      .filter((id) => defaultMap[id])
      .map((id) => ({ ...defaultMap[id], ...(savedMap[id] ?? {}) }))
    const extras = savedBp.filter((item) => !idSet.has(item.i))
    merged[bp] = [...items, ...extras]
  }
  return merged
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

export function useGridLayout(pageId, definitions) {
  const primaryDefs = useMemo(() => definitions.filter((d) => d.tier === 'primary'), [definitions])
  const secondaryDefs = useMemo(() => definitions.filter((d) => d.tier !== 'primary'), [definitions])
  const primaryIds = useMemo(() => primaryDefs.map((d) => d.id), [primaryDefs])
  const secondaryIds = useMemo(() => secondaryDefs.map((d) => d.id), [secondaryDefs])

  const defaultPrimary = useMemo(() => buildPrimaryLayouts(primaryDefs), [primaryDefs])
  const defaultSecondary = useMemo(() => buildSecondaryLayouts(secondaryDefs), [secondaryDefs])

  const [state, setState] = useState(() => {
    const saved = loadFromStorage(pageId)
    return {
      primaryLayouts: mergeLayouts(saved?.primaryLayouts, buildPrimaryLayouts(primaryDefs), primaryDefs.map((d) => d.id)),
      secondaryLayouts: mergeLayouts(saved?.secondaryLayouts, buildSecondaryLayouts(secondaryDefs), secondaryDefs.map((d) => d.id)),
      customMetrics: Array.isArray(saved?.customMetrics) ? saved.customMetrics : [],
    }
  })

  const onPrimaryLayoutChange = useCallback(
    (_cur, allLayouts) => {
      setState((prev) => {
        const next = { ...prev, primaryLayouts: allLayouts }
        saveToStorage(pageId, next)
        return next
      })
    },
    [pageId]
  )

  const onSecondaryLayoutChange = useCallback(
    (_cur, allLayouts) => {
      setState((prev) => {
        const next = { ...prev, secondaryLayouts: allLayouts }
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
        const newItem = { i: id, x: 0, y: 0, w: 2, h: 2, minW: 1, maxW: 6, minH: 2, maxH: 4 }
        const next = {
          ...prev,
          customMetrics: [...prev.customMetrics, newMetric],
          primaryLayouts: {
            ...prev.primaryLayouts,
            lg: [...(prev.primaryLayouts.lg ?? []), newItem],
            sm: [...(prev.primaryLayouts.sm ?? []), { ...newItem, w: 3, x: 0 }],
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
          primaryLayouts: Object.fromEntries(
            Object.entries(prev.primaryLayouts).map(([bp, items]) => [bp, items.filter((item) => item.i !== id)])
          ),
        }
        saveToStorage(pageId, next)
        return next
      })
    },
    [pageId]
  )

  return {
    primaryLayouts: state.primaryLayouts,
    secondaryLayouts: state.secondaryLayouts,
    customMetrics: state.customMetrics,
    onPrimaryLayoutChange,
    onSecondaryLayoutChange,
    addCustomMetric,
    removeCustomMetric,
  }
}
