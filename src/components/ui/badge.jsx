import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-brand/15 text-brand border border-brand/30',
        secondary: 'bg-surface-card text-muted-foreground border border-surface-border',
        positive: 'bg-green-500/15 text-green-400 border border-green-500/30',
        negative: 'bg-red-500/15 text-red-400 border border-red-500/30',
        purple: 'bg-purple-accent/15 text-purple-accent border border-purple-accent/30',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
