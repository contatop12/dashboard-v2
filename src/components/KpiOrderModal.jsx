import * as Dialog from '@radix-ui/react-dialog'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CORNER_DIALOG_CONTENT_CLASS } from '@/lib/cornerDialogClass'

export default function KpiOrderModal({ open, onOpenChange, items, order, onApply }) {
  function move(index, dir) {
    const next = [...order]
    const j = index + dir
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    onApply(next)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className={CORNER_DIALOG_CONTENT_CLASS}>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <Dialog.Title className="text-sm font-semibold text-white font-display">
              Ordem dos KPIs
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          <p className="shrink-0 pt-3 text-[11px] leading-relaxed text-muted-foreground font-sans">
            A ordem vale para a faixa &quot;Período anterior&quot; e o layout em linha. O grid continua editável por
            arrastar.
          </p>
          <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
            {order.map((id, index) => {
              const label = items.find((x) => x.id === id)?.label ?? id
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-surface-border bg-[#141414] px-3 py-2"
                >
                  <span className="text-[10px] text-muted-foreground font-mono w-5 shrink-0">{index + 1}</span>
                  <span className="flex-1 min-w-0 text-xs text-white font-sans truncate">{label}</span>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className={cn(
                        'rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-white',
                        index === 0 && 'opacity-30 pointer-events-none'
                      )}
                      aria-label="Subir"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === order.length - 1}
                      onClick={() => move(index, 1)}
                      className={cn(
                        'rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-white',
                        index === order.length - 1 && 'opacity-30 pointer-events-none'
                      )}
                      aria-label="Descer"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex shrink-0 justify-end border-t border-white/[0.06] pt-4">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-[#0F0F0F] hover:bg-brand/90"
              >
                Fechar
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
