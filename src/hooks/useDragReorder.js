import { useState, useRef, useCallback } from 'react'

/**
 * Reordena filhos de um container por pointer (mesmo padrão dos KPIs).
 * `getId(item, index)` retorna um identificador estável para feedback visual.
 */
function defaultGetId(item, index) {
  if (item && typeof item === 'object' && item.id != null) return item.id
  if (item != null && typeof item !== 'object') return String(item)
  return String(index)
}

export function useDragReorder(items, setItems, getId = defaultGetId) {
  const [draggingId, setDraggingId] = useState(null)
  const [overId, setOverId] = useState(null)
  const draggingIndex = useRef(null)
  const containerRef = useRef(null)

  const getIndexFromPoint = useCallback((x, y) => {
    if (!containerRef.current) return null
    const children = Array.from(containerRef.current.children)
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return i
    }
    return null
  }, [])

  const handlePointerDown = useCallback(
    (e, index) => {
      e.preventDefault()
      e.stopPropagation()
      draggingIndex.current = index
      setDraggingId(getId(items[index], index))

      function onMove(ev) {
        const idx = getIndexFromPoint(ev.clientX, ev.clientY)
        if (idx !== null && idx !== draggingIndex.current) {
          setOverId(getId(items[idx], idx))
        } else if (idx === null) {
          setOverId(null)
        }
      }

      function onUp(ev) {
        const idx = getIndexFromPoint(ev.clientX, ev.clientY)
        if (idx !== null && idx !== draggingIndex.current) {
          setItems((prev) => {
            const next = [...prev]
            const [moved] = next.splice(draggingIndex.current, 1)
            next.splice(idx, 0, moved)
            return next
          })
        }
        draggingIndex.current = null
        setDraggingId(null)
        setOverId(null)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [getId, getIndexFromPoint, items, setItems]
  )

  return { containerRef, draggingId, overId, handlePointerDown }
}
