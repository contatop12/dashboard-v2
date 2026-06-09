import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

/** Confirmation for live, irreversible actions (pausing/activating a running campaign). */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirmar', onConfirm, destructive = false }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border bg-surface-card p-6 shadow-2xl">
          <Dialog.Title className="font-display text-sm font-semibold text-foreground">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-xs text-muted-foreground">{description}</Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="rounded-md border border-surface-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-hover">
              Cancelar
            </Dialog.Close>
            <button
              type="button"
              onClick={() => { onConfirm(); onOpenChange(false) }}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold',
                destructive ? 'bg-danger text-white hover:bg-danger/90' : 'bg-brand text-[#0F0F0F] hover:bg-brand/90'
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
