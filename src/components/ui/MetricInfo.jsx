import * as Tooltip from '@radix-ui/react-tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMetric } from '@/lib/metricsDictionary'

/** (i) trigger that reveals a metric's definition + formula from the dictionary. */
export function MetricInfo({ metricKey, size = 12, className }) {
  const m = getMetric(metricKey)
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={`${m.label}${m.definition ? `: ${m.definition}` : ''}`}
            className={cn('inline-flex items-center text-muted-foreground transition-colors hover:text-foreground', className)}
          >
            <Info size={size} strokeWidth={2} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 max-w-[260px] rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs shadow-xl"
          >
            <p className="font-display text-[11px] font-semibold uppercase tracking-wide text-foreground">{m.label}</p>
            {m.definition ? <p className="mt-1 font-sans text-muted-foreground">{m.definition}</p> : null}
            {m.formula ? <p className="mt-1 font-mono text-[10px] text-brand">{m.formula}</p> : null}
            <Tooltip.Arrow className="fill-surface-card" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
