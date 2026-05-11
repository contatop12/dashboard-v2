import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import {
  META_CREATIVE_SORT_OPTIONS,
  META_CREATIVE_METRIC_OPTIONS,
} from '@/lib/metaCreativesPreferences'
import { CORNER_DIALOG_CONTENT_CLASS } from '@/lib/cornerDialogClass'

export default function MetaCreativesSettingsModal({
  open,
  onOpenChange,
  sortId,
  onSortIdChange,
  metricKeys,
  onMetricKeysChange,
}) {
  function setMetricAt(index, newKey) {
    const prev = [...metricKeys]
    const conflict = prev.findIndex((k, i) => k === newKey && i !== index)
    if (conflict >= 0) {
      ;[prev[index], prev[conflict]] = [prev[conflict], prev[index]]
    } else {
      prev[index] = newKey
    }
    onMetricKeysChange(prev)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className={CORNER_DIALOG_CONTENT_CLASS}>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <Dialog.Title className="text-sm font-semibold text-white font-display">
              Criativos — exibição
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

          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground font-sans">
                Ordenar por
              </label>
              <select
                value={sortId}
                onChange={(e) => onSortIdChange(e.target.value)}
                className="rounded-lg border border-surface-border bg-[#141414] px-3 py-2 text-xs text-white font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {META_CREATIVE_SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground font-sans">
                Métricas no card (3)
              </span>
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-foreground font-sans">Linha {index + 1}</label>
                  <select
                    value={metricKeys[index] ?? 'spend'}
                    onChange={(e) => setMetricAt(index, e.target.value)}
                    className="rounded-lg border border-surface-border bg-[#141414] px-3 py-2 text-xs text-white font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    {META_CREATIVE_METRIC_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

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
