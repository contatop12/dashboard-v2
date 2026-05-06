import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

/** Ícone discreto no canto inferior direito **do card/conteúdo** */
function CornerResizeGrip() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      className="text-muted-foreground/40"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 10v4M10 13h4M9 9l5 5"
      />
    </svg>
  )
}

export default function DashboardBlock({
  blockId,
  colSpan,
  rowSpan,
  minColSpan = 1,
  maxColSpan = 8,
  minRowSpan = 1,
  maxRowSpan = 12,
  /** Altura base de uma linha da grade (px) — alinha com theme.layout.cellHeightPx */
  cellHeight = 94,
  /** Gap vertical entre linhas da grade (px) */
  gapY = 12,
  colUnit,
  rowStride,
  isLg,
  draggingId,
  overId,
  onDragHandlePointerDown,
  onResizeCommit,
  children,
}) {
  const dragging = draggingId === blockId
  const over = overId === blockId
  const [preview, setPreview] = useState(null)
  const isKpiSlot = /^kpi-/i.test(blockId)

  const displayCol = preview?.col ?? colSpan
  const displayRow = preview?.row ?? rowSpan

  /** Altura total do bloco em linhas da grade (sem h-full — evita loop com aspect-ratio / grid auto-rows). */
  const blockHeightPx =
    displayRow * cellHeight + Math.max(0, displayRow - 1) * gapY

  const handleResizePointerDown = useCallback(
    (edge) => (e) => {
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const startCol = colSpan
      const startRow = rowSpan
      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)
      let lastNc = startCol
      let lastNr = startRow

      function onMove(ev) {
        let nc = startCol
        let nr = startRow
        const cu = Math.max(colUnit || 80, 1)
        const rs = Math.max(rowStride || 48, 1)
        if (edge === 'e' || edge === 'se') {
          nc = clamp(startCol + Math.round((ev.clientX - startX) / cu), minColSpan, maxColSpan)
        }
        if (edge === 's' || edge === 'se') {
          nr = clamp(startRow + Math.round((ev.clientY - startY) / rs), minRowSpan, maxRowSpan)
        }
        lastNc = nc
        lastNr = nr
        setPreview({ col: nc, row: nr })
      }

      function onUp() {
        setPreview(null)
        try {
          target.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        if (lastNc !== startCol || lastNr !== startRow) onResizeCommit(blockId, lastNc, lastNr)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [
      blockId,
      colSpan,
      rowSpan,
      colUnit,
      rowStride,
      minColSpan,
      maxColSpan,
      minRowSpan,
      maxRowSpan,
      onResizeCommit,
    ]
  )

  const gridStyle = isLg
    ? {
        gridColumn: `span ${displayCol}`,
        gridRow: `span ${displayRow}`,
        height: blockHeightPx,
      }
    : {}

  const dragHitClass = isKpiSlot
    ? 'absolute left-3 top-3 z-40 h-12 w-[min(200px,calc(100%-5rem))]'
    : 'absolute left-3 top-3 z-40 h-11 w-[min(220px,55%)]'

  return (
    <div
      data-block-id={blockId}
      className={cn(
        'relative flex min-w-0 flex-col',
        !isLg && 'w-full',
        isLg &&
          'min-h-0 w-full max-w-full justify-self-stretch self-stretch overflow-hidden rounded-[inherit]',
        dragging && 'z-[2] opacity-[0.88] shadow-lg ring-2 ring-brand/35 ring-offset-2 ring-offset-[rgb(var(--color-background))]',
        over && !dragging && 'ring-1 ring-brand/30'
      )}
      style={gridStyle}
    >
      <button
        type="button"
        aria-label="Arrastar bloco"
        title="Arrastar: arraste pela faixa superior esquerda do título"
        onPointerDown={(e) => onDragHandlePointerDown(e, blockId)}
        className={cn(
          dragHitClass,
          'cursor-grab bg-transparent [-webkit-tap-highlight-color:transparent] touch-none active:cursor-grabbing opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2'
        )}
      >
        <span className="sr-only">Arrastar para reordenar</span>
      </button>

      <div
        className={cn(
          'relative flex min-w-0 flex-col',
          isLg ? 'min-h-0 flex-1 overflow-hidden' : 'h-fit shrink-0'
        )}
      >
        {children}

        {isLg && (
          <button
            type="button"
            aria-label="Redimensionar bloco"
            title="Arrastar canto inferior direito para mudar largura e altura"
            onPointerDown={handleResizePointerDown('se')}
            className={cn(
              'absolute bottom-2 right-2 z-[10] flex h-8 w-8 cursor-nwse-resize flex-col-reverse items-end justify-end rounded-md p-1',
              'bg-transparent hover:bg-black/15 hover:text-muted-foreground',
              'text-muted-foreground/50 [-webkit-tap-highlight-color:transparent]',
              'focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand/50 focus-visible:outline-offset-0'
            )}
          >
            <CornerResizeGrip />
          </button>
        )}
      </div>

      {preview && (
        <div className="pointer-events-none absolute inset-0 z-[30] flex items-center justify-center rounded-[inherit] bg-black/35">
          <span className="rounded-md border border-brand/35 bg-surface-card px-3 py-1.5 font-mono text-sm font-semibold text-brand">
            {preview.col}×{preview.row}
          </span>
        </div>
      )}
    </div>
  )
}
