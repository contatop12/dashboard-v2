import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { API_FIELDS } from '@/lib/apiFields'

export default function AddMetricModal({ open, onOpenChange, onAdd, existingIds }) {
  const [selected, setSelected] = useState(null)

  const available = API_FIELDS.filter((f) => !existingIds.includes(`kpi-custom-${f.key}`))

  function handleConfirm() {
    if (!selected) return
    onAdd(selected)
    setSelected(null)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-surface-card p-6 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              Adicionar métrica
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
            {available.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Todas as métricas disponíveis já foram adicionadas.
              </p>
            )}
            {available.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => setSelected(field)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors',
                  selected?.key === field.key
                    ? 'bg-brand/20 text-brand'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                <span className="flex-1">{field.label}</span>
                {selected?.key === field.key && <Check size={12} />}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selected}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                selected
                  ? 'bg-brand text-black hover:bg-brand/90'
                  : 'bg-white/10 text-muted-foreground cursor-not-allowed'
              )}
            >
              Adicionar
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
