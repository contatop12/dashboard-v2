import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { blockLayoutStorageKey } from '@/lib/dashboardGrid'

function clampSpan(n, min, max) {
  const v = Math.round(Number(n) || 1)
  return Math.max(min, Math.min(max, v))
}

function primaryIdsFromDefinitions(definitions) {
  return new Set(definitions.filter((d) => d.tier === 'primary').map((d) => d.id))
}

function secondaryIdsFromDefinitions(definitions) {
  return new Set(definitions.filter((d) => d.tier !== 'primary').map((d) => d.id))
}

function normalizeOrder(savedList, allowedSet, definitionsDefaults) {
  const seen = new Set()
  const out = []
  const list = Array.isArray(savedList) ? savedList : []
  for (const id of list) {
    if (allowedSet.has(id) && !seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  for (const id of definitionsDefaults) {
    if (allowedSet.has(id) && !seen.has(id)) out.push(id)
  }
  return out
}

/**
 * @param {Array<{ id: string, tier?: string }>} definitions
 * @param {object | null} saved
 */
export function mergeBlockLayout(definitions, saved) {
  const primarySet = primaryIdsFromDefinitions(definitions)
  const secondarySet = secondaryIdsFromDefinitions(definitions)
  const defaultPrimary = definitions.filter((d) => d.tier === 'primary').map((d) => d.id)
  const defaultSecondary = definitions.filter((d) => d.tier !== 'primary').map((d) => d.id)

  let primaryOrder
  let secondaryOrder

  if (Array.isArray(saved?.primaryOrder) && Array.isArray(saved?.secondaryOrder)) {
    primaryOrder = normalizeOrder(saved.primaryOrder, primarySet, defaultPrimary)
    secondaryOrder = normalizeOrder(saved.secondaryOrder, secondarySet, defaultSecondary)
  } else if (Array.isArray(saved?.order)) {
    primaryOrder = normalizeOrder(
      saved.order.filter((id) => primarySet.has(id)),
      primarySet,
      defaultPrimary
    )
    secondaryOrder = normalizeOrder(
      saved.order.filter((id) => secondarySet.has(id)),
      secondarySet,
      defaultSecondary
    )
  } else {
    primaryOrder = [...defaultPrimary]
    secondaryOrder = [...defaultSecondary]
  }

  const spans = {}
  for (const d of definitions) {
    const s = saved?.spans?.[d.id]
    const minC = d.minColSpan ?? 1
    const maxC = d.maxColSpan ?? 8
    const minR = d.minRowSpan ?? 1
    const maxR = d.maxRowSpan ?? 12
    spans[d.id] = {
      colSpan: clampSpan(s?.colSpan ?? d.defaultColSpan ?? 1, minC, maxC),
      rowSpan: clampSpan(s?.rowSpan ?? d.defaultRowSpan ?? 1, minR, maxR),
    }
  }

  return { primaryOrder, secondaryOrder, spans }
}

/**
 * @param {string} pageId
 * @param {Array<{ id: string, tier?: 'primary' | 'secondary', defaultColSpan?: number, defaultRowSpan?: number, minColSpan?: number, maxColSpan?: number, minRowSpan?: number, maxRowSpan?: number, render: () => import('react').ReactNode }>} definitions
 */
export function useGridLayout(pageId, definitions) {
  const defKey = useMemo(() => definitions.map((d) => d.id).join('|'), [definitions])
  const definitionsRef = useRef(definitions)
  definitionsRef.current = definitions

  const defaults = useMemo(() => mergeBlockLayout(definitions, null), [defKey])

  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(blockLayoutStorageKey(pageId))
      if (raw) return mergeBlockLayout(definitions, JSON.parse(raw))
    } catch {
      /* ignore */
    }
    return defaults
  })

  useEffect(() => {
    setState((prev) => mergeBlockLayout(definitionsRef.current, prev))
  }, [pageId, defKey])

  useEffect(() => {
    try {
      const { primaryOrder, secondaryOrder, spans } = state
      localStorage.setItem(blockLayoutStorageKey(pageId), JSON.stringify({ primaryOrder, secondaryOrder, spans }))
    } catch {
      /* ignore */
    }
  }, [pageId, state])

  const setPrimaryOrder = useCallback((updater) => {
    setState((s) => ({
      ...s,
      primaryOrder: typeof updater === 'function' ? updater(s.primaryOrder) : updater,
    }))
  }, [])

  const setSecondaryOrder = useCallback((updater) => {
    setState((s) => ({
      ...s,
      secondaryOrder: typeof updater === 'function' ? updater(s.secondaryOrder) : updater,
    }))
  }, [])

  const resizeBlock = useCallback((id, colSpan, rowSpan) => {
    const def = definitionsRef.current.find((d) => d.id === id)
    if (!def) return
    const minC = def.minColSpan ?? 1
    const maxC = def.maxColSpan ?? 8
    const minR = def.minRowSpan ?? 1
    const maxR = def.maxRowSpan ?? 12
    setState((s) => ({
      ...s,
      spans: {
        ...s.spans,
        [id]: {
          colSpan: clampSpan(colSpan, minC, maxC),
          rowSpan: clampSpan(rowSpan, minR, maxR),
        },
      },
    }))
  }, [])

  return {
    primaryOrder: state.primaryOrder,
    secondaryOrder: state.secondaryOrder,
    spans: state.spans,
    setPrimaryOrder,
    setSecondaryOrder,
    resizeBlock,
    defaults,
  }
}
