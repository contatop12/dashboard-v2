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
  } catch {
    /* ignore */
  }
}

function defaultPrimaryOrder(primaryDefs, customMetrics) {
  return [...primaryDefs.map((d) => d.id), ...customMetrics.map((m) => m.id)]
}

function normalizePrimaryKpiOrder(saved, defaultOrder) {
  if (!Array.isArray(saved)) return defaultOrder
  const set = new Set(defaultOrder)
  const out = saved.filter((id) => set.has(id))
  for (const id of defaultOrder) {
    if (!out.includes(id)) out.push(id)
  }
  return out
}

function sortLayoutIdsByPosition(lg) {
  return [...lg].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y)).map((i) => i.i)
}

function nextSlotBelow(lg) {
  if (!lg.length) return { x: 0, y: 0 }
  const bottom = Math.max(...lg.map((i) => i.y + i.h))
  return { x: 0, y: bottom }
}

function nextSlotBelowSm(sm) {
  if (!sm.length) return { x: 0, y: 0 }
  const bottom = Math.max(...sm.map((i) => i.y + i.h))
  return { x: 0, y: bottom }
}

function reflowPrimaryLayoutsForOrder(order, prevLayouts, primaryDefs) {
  const defById = Object.fromEntries(primaryDefs.map((d) => [d.id, d]))
  const lgPrev = prevLayouts.lg ?? []
  const smPrev = prevLayouts.sm ?? []
  const newLg = []
  let x = 0
  let y = 0
  let rowMaxH = 0
  for (const id of order) {
    const prevItem = lgPrev.find((p) => p.i === id)
    const baseDef = defById[id]
    const w = prevItem?.w ?? baseDef?.defaultLayout?.w ?? 2
    const h = prevItem?.h ?? baseDef?.defaultLayout?.h ?? 2
    const minW = prevItem?.minW ?? baseDef?.defaultLayout?.minW ?? 1
    const maxW = prevItem?.maxW ?? baseDef?.defaultLayout?.maxW ?? 6
    const minH = prevItem?.minH ?? baseDef?.defaultLayout?.minH ?? 1
    const maxH = prevItem?.maxH ?? baseDef?.defaultLayout?.maxH ?? 4
    if (x + w > 12) {
      y += rowMaxH
      rowMaxH = 0
      x = 0
    }
    newLg.push({ i: id, x, y, w, h, minW, maxW, minH, maxH })
    rowMaxH = Math.max(rowMaxH, h)
    x += w
  }

  const newSm = []
  let smY = 0
  for (const id of order) {
    const prevItem = smPrev.find((p) => p.i === id)
    const baseDef = defById[id]
    const h = prevItem?.h ?? baseDef?.defaultLayout?.h ?? 2
    newSm.push({
      i: id,
      x: 0,
      y: smY,
      w: 3,
      h,
      minW: 1,
      maxW: 6,
      minH: 1,
    })
    smY += h
  }
  return { lg: newLg, sm: newSm }
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
    const customMetrics = Array.isArray(saved?.customMetrics) ? saved.customMetrics : []
    const defaultOrder = defaultPrimaryOrder(primaryDefs, customMetrics)
    const primaryKpiOrder = normalizePrimaryKpiOrder(saved?.primaryKpiOrder, defaultOrder)
    return {
      primaryLayouts: mergeLayouts(
        saved?.primaryLayouts,
        buildPrimaryLayouts(primaryDefs),
        primaryDefs.map((d) => d.id)
      ),
      secondaryLayouts: mergeLayouts(
        saved?.secondaryLayouts,
        buildSecondaryLayouts(secondaryDefs),
        secondaryDefs.map((d) => d.id)
      ),
      customMetrics,
      primaryKpiOrder,
    }
  })

  const onPrimaryLayoutChange = useCallback(
    (_cur, allLayouts) => {
      setState((prev) => {
        const lg = allLayouts.lg ?? []
        const fromLayout = sortLayoutIdsByPosition(lg)
        const known = new Set([...primaryIds, ...prev.customMetrics.map((m) => m.id)])
        const mergedOrder = []
        for (const id of fromLayout) {
          if (known.has(id)) mergedOrder.push(id)
        }
        for (const id of prev.primaryKpiOrder) {
          if (known.has(id) && !mergedOrder.includes(id)) mergedOrder.push(id)
        }
        for (const id of known) {
          if (!mergedOrder.includes(id)) mergedOrder.push(id)
        }
        const next = { ...prev, primaryLayouts: allLayouts, primaryKpiOrder: mergedOrder }
        saveToStorage(pageId, next)
        return next
      })
    },
    [pageId, primaryIds]
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

  const reorderPrimaryKpis = useCallback(
    (newOrder) => {
      setState((prev) => {
        const valid = new Set([...primaryIds, ...prev.customMetrics.map((m) => m.id)])
        const filtered = newOrder.filter((id) => valid.has(id))
        for (const id of valid) {
          if (!filtered.includes(id)) filtered.push(id)
        }
        const layouts = reflowPrimaryLayoutsForOrder(filtered, prev.primaryLayouts, primaryDefs)
        const next = { ...prev, primaryKpiOrder: filtered, primaryLayouts: layouts }
        saveToStorage(pageId, next)
        return next
      })
    },
    [pageId, primaryIds, primaryDefs]
  )

  const addCustomMetric = useCallback(
    (field) => {
      const id = `kpi-custom-${field.key}`
      setState((prev) => {
        if (prev.customMetrics.find((m) => m.id === id)) return prev
        const newMetric = { id, fieldKey: field.key, label: field.label, format: field.format }
        const lg = [...(prev.primaryLayouts.lg ?? [])]
        const sm = [...(prev.primaryLayouts.sm ?? [])]
        const posLg = nextSlotBelow(lg)
        const posSm = nextSlotBelowSm(sm)
        const newItem = {
          i: id,
          x: posLg.x,
          y: posLg.y,
          w: 2,
          h: 2,
          minW: 1,
          maxW: 6,
          minH: 2,
          maxH: 4,
        }
        lg.push(newItem)
        sm.push({ ...newItem, w: 3, x: posSm.x, y: posSm.y })
        const nextOrder = [...(prev.primaryKpiOrder ?? []), id]
        const next = {
          ...prev,
          customMetrics: [...prev.customMetrics, newMetric],
          primaryLayouts: { ...prev.primaryLayouts, lg, sm },
          primaryKpiOrder: nextOrder,
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
          primaryKpiOrder: (prev.primaryKpiOrder ?? []).filter((x) => x !== id),
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
    primaryKpiOrder: state.primaryKpiOrder,
    onPrimaryLayoutChange,
    onSecondaryLayoutChange,
    addCustomMetric,
    removeCustomMetric,
    reorderPrimaryKpis,
  }
}
