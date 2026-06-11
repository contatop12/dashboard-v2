import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Paginação compacta para tabelas de blocos (estilo X/Y com setas). */
export function MiniPagination({ page, totalPages, onPage, className }) {
  if (totalPages <= 1) return null
  return (
    <div className={cn('flex shrink-0 items-center justify-end gap-1', className)}>
      <button
        type="button"
        disabled={page <= 1}
        className={cn(
          'p-1 rounded-md border border-transparent',
          page <= 1
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-input border-surface-border'
        )}
        aria-label="Página anterior"
        onClick={() => onPage(Math.max(1, page - 1))}
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-[10px] font-mono text-muted-foreground tabular-nums px-1">
        {page}/{totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        className={cn(
          'p-1 rounded-md border border-transparent',
          page >= totalPages
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-input border-surface-border'
        )}
        aria-label="Próxima página"
        onClick={() => onPage(Math.min(totalPages, page + 1))}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
