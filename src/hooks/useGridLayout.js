import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { blockLayoutStorageKey } from '@/lib/dashboardGrid'

function clampSpan(n, min, max) {
  const v = Math.round(Number(n) || 1)
  return Math.max(min, Math.min(max, v))
}

export function mergeBlockLayout(definitions, saved) {
  const ids = new Set(definitions.map((d) => d.id))
  let order = Array.isArray(saved?.order)
    ? saved.order.filter((id) => ids.has(id))
    : definitions.map((d) => d.id)
  for (const d of definitions) {
    if (!order.includes(d.id)) order.push(d.id)
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
  return { order, spans }
}

/**
 * @param {string} pageId
 * @param {Array<{ id: string, defaultColSpan?: number, defaultRowSpan?: number, minColSpan?: number, maxColSpan?: number, minRowSpan?: number, maxRowSpan?: number, render: () => import('react').ReactNode }>} definitions
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
      localStorage.setItem(blockLayoutStorageKey(pageId), JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [pageId, state])

  const setOrder = useCallback((updater) => {
    setState((s) => ({
      ...s,
      order: typeof updater === 'function' ? updater(s.order) : updater,
    }))
  }, [])

  const resizeBlock = useCallback(
    (id, colSpan, rowSpan) => {
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
    },
    []
  )

  return {
    order: state.order,
    spans: state.spans,
    setOrder,
    resizeBlock,
    defaults,
  }
}
