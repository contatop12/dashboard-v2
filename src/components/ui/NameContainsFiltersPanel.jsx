import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LEVEL_SLOT_IDS, NAME_CONTAINS_LEVELS } from '@/lib/filterOptionsFromTree'

const SLOT_LEVELS = ['campanha', 'children', 'ads']

function levelLabel(level, childLevelLabel) {
  if (level === 'children') return childLevelLabel
  return NAME_CONTAINS_LEVELS.find((l) => l.id === level)?.label ?? level
}

function normalizeFilters(filters) {
  return Array.isArray(filters) ? filters : []
}

function upsertSlotFilter(filters, level, text) {
  const slotId = LEVEL_SLOT_IDS[level]
  const trimmed = String(text ?? '').trim()
  const rest = normalizeFilters(filters).filter((f) => f.id !== slotId)
  if (!trimmed) return rest
  return [...rest, { id: slotId, level, text: trimmed }]
}

function slotText(filters, level) {
  const slotId = LEVEL_SLOT_IDS[level]
  return normalizeFilters(filters).find((f) => f.id === slotId)?.text ?? ''
}

function extraFilters(filters) {
  const slotIds = new Set(Object.values(LEVEL_SLOT_IDS))
  return normalizeFilters(filters).filter((f) => !slotIds.has(f.id) && String(f.text ?? '').trim())
}

/**
 * Painel com campos separados por nível (campanha, conjunto/grupo, anúncio) e filtros extras adicionáveis.
 */
export function NameContainsFiltersPanel({
  filters = [],
  onChange,
  childLevelLabel = 'Conjunto',
  compact = false,
}) {
  const [draftLevel, setDraftLevel] = useState('campanha')
  const [draftText, setDraftText] = useState('')

  const extras = useMemo(() => extraFilters(filters), [filters])
  const levelOptions = NAME_CONTAINS_LEVELS.map((l) =>
    l.id === 'children' ? { ...l, label: childLevelLabel } : l
  )

  const setSlot = (level, text) => onChange(upsertSlotFilter(filters, level, text))

  const addExtra = () => {
    const text = draftText.trim()
    if (!text) return
    onChange([
      ...normalizeFilters(filters),
      { id: `extra-${Date.now()}`, level: draftLevel, text },
    ])
    setDraftText('')
  }

  const removeFilter = (id) => {
    onChange(normalizeFilters(filters).filter((f) => f.id !== id))
  }

  const clearAllTitleFilters = () => {
    onChange([])
  }

  const hasAny = normalizeFilters(filters).some((f) => String(f.text ?? '').trim())

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {SLOT_LEVELS.map((level) => (
          <label
            key={level}
            className={cn(
              'flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02]',
              compact ? 'h-7 px-2' : 'h-8 px-2.5',
              slotText(filters, level) && 'border-brand/40 bg-brand/10'
            )}
          >
            <span
              className={cn(
                'shrink-0 font-sans text-muted-foreground',
                compact ? 'text-[10px]' : 'text-[11px]'
              )}
            >
              {levelLabel(level, childLevelLabel)}
            </span>
            <input
              type="text"
              value={slotText(filters, level)}
              onChange={(e) => setSlot(level, e.target.value)}
              placeholder="Contém…"
              className={cn(
                'min-w-0 border-0 bg-transparent text-white placeholder:text-muted-foreground outline-none',
                compact ? 'w-[5.5rem] text-[11px]' : 'w-[7rem] text-xs'
              )}
              aria-label={`${levelLabel(level, childLevelLabel)} contém no título`}
            />
          </label>
        ))}

        <div
          className={cn(
            'flex items-center gap-1 rounded-md border border-dashed border-white/[0.12] bg-white/[0.01]',
            compact ? 'h-7 px-1' : 'h-8 px-1.5'
          )}
        >
          <select
            value={draftLevel}
            onChange={(e) => setDraftLevel(e.target.value)}
            className={cn(
              'cursor-pointer border-0 bg-transparent text-muted-foreground outline-none',
              compact ? 'max-w-[5rem] text-[10px]' : 'max-w-[6rem] text-[11px]'
            )}
            aria-label="Nível do filtro extra"
          >
            {levelOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addExtra()
              }
            }}
            placeholder="Outro filtro…"
            className={cn(
              'min-w-0 border-0 bg-transparent text-white placeholder:text-muted-foreground outline-none',
              compact ? 'w-[5.5rem] text-[11px]' : 'w-[7rem] text-xs'
            )}
            aria-label="Texto do filtro extra"
          />
          <button
            type="button"
            onClick={addExtra}
            disabled={!draftText.trim()}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-white disabled:opacity-40"
            aria-label="Adicionar filtro"
            title="Adicionar filtro"
          >
            <Plus size={14} />
          </button>
        </div>

        {hasAny ? (
          <button
            type="button"
            onClick={clearAllTitleFilters}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:text-white"
          >
            <X size={12} aria-hidden />
            Títulos
          </button>
        ) : null}
      </div>

      {extras.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {extras.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] text-brand"
            >
              <span className="text-muted-foreground">{levelLabel(f.level, childLevelLabel)}:</span>
              <span className="max-w-[8rem] truncate font-medium text-white">{f.text}</span>
              <button
                type="button"
                onClick={() => removeFilter(f.id)}
                className="text-muted-foreground hover:text-white"
                aria-label={`Remover filtro ${f.text}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
