import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function CreativeCard({ card }) {
  return (
    <div
      className="flex flex-col shrink-0 w-44 rounded-xl overflow-hidden bg-surface-input border border-surface-border hover:border-brand/40 transition-all duration-200 group"
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* Thumbnail */}
      <div className="relative w-full" style={{ aspectRatio: '4/5', background: card.gradient }}>
        {card.image ? (
          <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-40">
            <div className="w-12 h-8 rounded-sm border border-white/20" />
            <div className="w-16 h-1 rounded-full bg-white/30" />
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
        )}
        {card.tag && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase"
              style={{ background: card.tagBg, color: card.tagColor }}>
              {card.tag}
            </span>
          </div>
        )}
        {card.status && (
          <div className="absolute top-2 right-2">
            <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded-full',
              card.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30')}>
              {card.status === 'active' ? '● Ativo' : '● Pausado'}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2.5">
        <p className="text-[11px] font-sans text-white font-medium leading-tight line-clamp-2 min-h-[2.5em]">
          {card.name}
        </p>

        <div className="flex flex-col gap-1.5 pt-1 border-t border-surface-border">
          {card.metrics.map(({ label, value, highlight }) => (
            <div key={label} className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans text-muted-foreground truncate">{label}</span>
              <span className={cn('text-[11px] font-mono font-semibold shrink-0',
                highlight ? 'text-brand' : 'text-white')}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CreativesCarousel({ title, cards, badge }) {
  const scrollRef = useRef(null)

  function scroll(dir) {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="section-title">{title}</span>
          {badge && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/20">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll(-1)}
            className="w-6 h-6 rounded flex items-center justify-center bg-surface-hover hover:bg-surface-border transition-colors"
          >
            <ChevronLeft size={12} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-6 h-6 rounded flex items-center justify-center bg-surface-hover hover:bg-surface-border transition-colors"
          >
            <ChevronRight size={12} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 py-3"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cards.map((card, i) => (
          <CreativeCard key={i} card={card} />
        ))}
      </div>
    </div>
  )
}
