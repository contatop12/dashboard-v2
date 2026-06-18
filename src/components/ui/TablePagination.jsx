import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * Cálculo puro do recorte de página. `pageSize` pode ser número ou 'all' (Todas).
 * Clampa página dentro de [1, totalPages] e nunca devolve Infinity/NaN.
 */
export function computePageSlice(total, page, pageSize) {
  const t = Math.max(0, Number(total) || 0)
  const effSize = pageSize === 'all' ? Math.max(t, 1) : Math.max(1, Number(pageSize) || 1)
  const totalPages = Math.max(1, Math.ceil(t / effSize))
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const start = t === 0 ? 0 : (safePage - 1) * effSize
  const end = Math.min(start + effSize, t)
  return {
    effSize,
    totalPages,
    safePage,
    start,
    end,
    rangeStart: t === 0 ? 0 : start + 1,
    rangeEnd: end,
  }
}

function readStoredSize(key, fallback) {
  if (!key) return fallback
  try {
    const v = localStorage.getItem(key)
    if (v == null) return fallback
    if (v === 'all') return 'all'
    const n = Number.parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  } catch {
    return fallback
  }
}

/**
 * Estado de paginação com tamanho de página escolhível (persistido por `storageKey`).
 * Devolve as linhas já recortadas e os dados para o controle `TablePagination`.
 */
export function usePagedRows(rows, { storageKey, defaultSize = 10 } = {}) {
  const list = Array.isArray(rows) ? rows : []
  const total = list.length
  const [pageSize, setPageSizeState] = useState(() => readStoredSize(storageKey, defaultSize))
  const [page, setPage] = useState(1)

  const setPageSize = (v) => {
    setPageSizeState(v)
    setPage(1)
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, String(v))
      } catch {
        /* ignore */
      }
    }
  }

  // Reseta página quando o conjunto ou o tamanho muda
  useEffect(() => {
    setPage(1)
  }, [total, pageSize])

  const slice = computePageSlice(total, page, pageSize)
  const pageRows = list.slice(slice.start, slice.end)

  return {
    page: slice.safePage,
    setPage,
    pageSize,
    setPageSize,
    totalPages: slice.totalPages,
    pageRows,
    total,
    rangeStart: slice.rangeStart,
    rangeEnd: slice.rangeEnd,
  }
}

/**
 * Controle de paginação: seletor de linhas por página + setas.
 * As setas só aparecem quando há mais de uma página.
 */
export function TablePagination({
  page,
  totalPages,
  onPage,
  pageSize,
  onPageSize,
  total,
  rangeStart,
  rangeEnd,
  options = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
}) {
  const opts = [...options]
  if (typeof pageSize === 'number' && !opts.includes(pageSize)) {
    opts.push(pageSize)
    opts.sort((a, b) => a - b)
  }

  return (
    <div className={cn('flex shrink-0 flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-[10px] font-sans text-muted-foreground">
          Linhas:
          <select
            value={String(pageSize)}
            onChange={(e) =>
              onPageSize(e.target.value === 'all' ? 'all' : Number.parseInt(e.target.value, 10))
            }
            className="rounded-md border border-surface-border bg-[#141414] py-1 pl-2 pr-6 text-[10px] text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Linhas por página"
          >
            {opts.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value="all">Todas</option>
          </select>
        </label>
        {total > 0 ? (
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {rangeStart}–{rangeEnd} de {total}
          </span>
        ) : null}
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            className={cn(
              'rounded-md border border-transparent p-1',
              page <= 1
                ? 'cursor-not-allowed text-muted-foreground/40'
                : 'border-surface-border text-muted-foreground hover:bg-surface-input hover:text-foreground'
            )}
            aria-label="Página anterior"
            onClick={() => onPage(Math.max(1, page - 1))}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-1 font-mono text-[10px] tabular-nums text-muted-foreground">
            {page}/{totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            className={cn(
              'rounded-md border border-transparent p-1',
              page >= totalPages
                ? 'cursor-not-allowed text-muted-foreground/40'
                : 'border-surface-border text-muted-foreground hover:bg-surface-input hover:text-foreground'
            )}
            aria-label="Próxima página"
            onClick={() => onPage(Math.min(totalPages, page + 1))}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
