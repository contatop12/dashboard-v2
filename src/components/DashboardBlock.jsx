import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardBlock({ blockId, isEditing, children }) {
  return (
    <div
      data-block-id={blockId}
      className="relative flex min-w-0 flex-col h-full w-full"
    >
      {isEditing && (
        <div
          className={cn(
            'widget-drag-handle absolute left-2 top-2 z-40',
            'flex h-7 w-7 cursor-grab items-center justify-center',
            'rounded-md bg-black/40 text-muted-foreground/70',
            'opacity-0 transition-opacity group-hover:opacity-100',
            'hover:bg-black/60 hover:text-foreground active:cursor-grabbing'
          )}
          title="Arrastar para reordenar"
        >
          <GripVertical size={13} />
        </div>
      )}
      <div className="relative flex min-w-0 flex-col h-full w-full overflow-hidden">
        {children}
      </div>
    </div>
  )
}
