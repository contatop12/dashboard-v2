import { useState, useRef, useCallback } from 'react'

/** Reordena `prev` movendo `srcId` para a posição de `targetId` (drop sobre o alvo). */
function reorderById(prev, srcId, targetId) {
  const fromIdx = prev.indexOf(srcId)
  const toIdx = prev.indexOf(targetId)
  if (fromIdx === -1 || toIdx === -1 || srcId === targetId) return prev
  const next = [...prev]
  const [moved] = next.splice(fromIdx, 1)
  const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx
  next.splice(insertAt, 0, moved)
  return next
}

/**
 * Reordena itens do dashboard por pointer.
 * Hit-test em `[data-block-id]` para funcionar com wrappers (ex.: faixa de KPIs).
 */
export function useDragReorder(items, setItems) {
  const [draggingId, setDraggingId] = useState(null)
  const [overId, setOverId] = useState(null)
  const draggingIdRef = useRef(null)
  const containerRef = useRef(null)

  const getBlockIdAtPoint = useCallback((x, y) => {
    if (!containerRef.current) return null
    const nodes = containerRef.current.querySelectorAll('[data-block-id]')
    for (const el of nodes) {
      const rect = el.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return el.getAttribute('data-block-id')
      }
    }
    return null
  }, [])

  const handlePointerDown = useCallback(
    (e, blockId) => {
      e.preventDefault()
      e.stopPropagation()
      draggingIdRef.current = blockId
      setDraggingId(blockId)

      function onMove(ev) {
        const id = getBlockIdAtPoint(ev.clientX, ev.clientY)
        if (id != null && id !== draggingIdRef.current) {
          setOverId(id)
        } else if (id === null) {
          setOverId(null)
        }
      }

      function onUp(ev) {
        const targetId = getBlockIdAtPoint(ev.clientX, ev.clientY)
        const srcId = draggingIdRef.current
        draggingIdRef.current = null
        setDraggingId(null)
        setOverId(null)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)

        if (targetId != null && srcId != null && targetId !== srcId) {
          setItems((prev) => reorderById(prev, srcId, targetId))
        }
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [getBlockIdAtPoint, setItems]
  )

  return { containerRef, draggingId, overId, handlePointerDown }
}
