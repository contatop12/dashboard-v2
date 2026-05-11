import * as Dialog from '@radix-ui/react-dialog'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-surface-card p-5 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between mb-3">
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
          <p className="text-[11px] text-muted-foreground font-sans mb-4">
            A ordem vale para a faixa &quot;Período anterior&quot; e o layout em linha. O grid continua editável por
            arrastar.
          </p>
          <ul className="flex flex-col gap-1 max-h-[min(60vh,360px)] overflow-y-auto pr-1">
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
          <div className="mt-4 flex justify-end">
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
