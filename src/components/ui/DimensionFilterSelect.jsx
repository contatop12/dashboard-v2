import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SEARCH_THRESHOLD = 8

/** Dropdown de filtro por dimensão (campanha, grupo, etc.). */
export function DimensionFilterSelect({ filterKey, label, value, options, onChange, onClear, compact }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    const close = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('pointerdown', close, true)
    return () => window.removeEventListener('pointerdown', close, true)
  }, [open])

  const list = Array.isArray(options) ? options : []
  const filtered = query
    ? list.filter((o) => String(o.name ?? '').toLowerCase().includes(query.toLowerCase()))
    : list
  const showSearch = list.length > SEARCH_THRESHOLD

  return (
    <div className="relative z-[40]" ref={wrapRef}>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cn('filter-select', compact && 'h-7 text-[11px]', value && 'border-brand/40 bg-brand/10')}
      >
        <span className={cn('truncate text-white', compact ? 'max-w-[120px]' : 'max-w-[160px]')}>
          {value?.name || label}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Limpar ${label}`}
            onClick={(e) => {
              e.stopPropagation()
              onClear(filterKey)
            }}
            onKeyDown={(e) => e.key === 'Enter' && onClear(filterKey)}
            className="shrink-0 text-muted-foreground hover:text-white"
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-[50] mt-2 max-h-64 min-w-[220px] overflow-y-auto rounded-lg border border-surface-border bg-surface-card py-2 shadow-xl animate-scale-in">
          {showSearch && (
            <div className="px-2 pb-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="w-full rounded-md border border-surface-border bg-surface-input px-2 py-1.5 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              onClear(filterKey)
              setOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-xs text-muted-foreground hover:bg-surface-hover transition-colors"
          >
            Todos
          </button>
          {filtered.length === 0 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">Sem opções no período.</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(filterKey, opt)
                  setOpen(false)
                }}
                className={cn(
                  'w-full truncate px-4 py-2 text-left text-xs hover:bg-surface-hover transition-colors',
                  value?.id === opt.id ? 'text-brand' : 'text-white'
                )}
                title={opt.name}
              >
                {opt.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
