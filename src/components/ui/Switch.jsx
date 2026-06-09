import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Accessible on/off toggle. `<button role="switch">` handles Space/Enter natively.
 * on = brand/active, off = neutral, loading = spinner + non-interactive.
 */
export function Switch({ checked, onCheckedChange, disabled = false, loading = false, size = 'md', className, ...props }) {
  const inert = disabled || loading
  const dims = size === 'sm' ? { w: 'w-8', h: 'h-[18px]', knob: 'h-3.5 w-3.5', on: 'translate-x-[14px]' } : { w: 'w-11', h: 'h-6', knob: 'h-5 w-5', on: 'translate-x-5' }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={loading || undefined}
      disabled={inert}
      onClick={() => { if (!inert) onCheckedChange(!checked) }}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        dims.w, dims.h,
        checked ? 'bg-brand' : 'bg-muted',
        inert ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none flex items-center justify-center rounded-full bg-white shadow transition-transform',
          dims.knob,
          checked ? dims.on : 'translate-x-0'
        )}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
      </span>
    </button>
  )
}
