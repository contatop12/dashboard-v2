import { cn } from '@/lib/utils'

export default function DashboardBlock({ blockId, className, style, children }) {
  return (
    <div
      data-block-id={blockId}
      className={cn('flex min-w-0 flex-col', className)}
      style={style}
    >
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
