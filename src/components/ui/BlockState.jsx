import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Standard loading/empty/error presentation used inside BlockCard. */
export function BlockState({ state, message, className }) {
  if (state === 'loading') {
    return (
      <div data-testid="block-skeleton" className={cn('flex flex-col gap-2', className)}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-muted/60" />
        ))}
      </div>
    )
  }
  if (state === 'error') {
    return (
      <div role="alert" className={cn('rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger', className)}>
        {message || 'Erro ao carregar dados.'}
      </div>
    )
  }
  if (state === 'empty') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 py-8 text-center', className)}>
        <Inbox size={20} className="text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">{message || 'Sem dados no período.'}</p>
      </div>
    )
  }
  return null
}
