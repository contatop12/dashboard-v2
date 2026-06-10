import { cn } from '@/lib/utils'
import { MetricInfo } from './MetricInfo'
import { BlockState } from './BlockState'

/**
 * Single block shell. Replaces ad-hoc `bg-surface-card border rounded-lg p-4`.
 * Consistent radius/border/padding + header (title + info + actions).
 */
export function BlockCard({ title, infoKey, actions, badge, state = 'ready', emptyMessage, errorMessage, className, headerClassName, bodyClassName, children }) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/[0.06] bg-surface-card', className)}>
      {(title || actions || badge) && (
        <div className={cn('flex shrink-0 items-center justify-between gap-2 px-4 py-3', headerClassName)}>
          <div className="flex min-w-0 items-center gap-1.5">
            {title ? <span className="section-title truncate">{title}</span> : null}
            {infoKey ? <MetricInfo metricKey={infoKey} /> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {badge ? <span className="font-mono text-[10px] text-muted-foreground">{badge}</span> : null}
            {actions}
          </div>
        </div>
      )}
      <div className={cn('min-h-0 flex-1 px-4 pb-4', bodyClassName)}>
        {state === 'ready' ? children : <BlockState state={state} message={state === 'empty' ? emptyMessage : errorMessage} />}
      </div>
    </div>
  )
}
