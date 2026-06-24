import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAME_CONTAINS_LEVELS } from '@/lib/filterOptionsFromTree'

const DEFAULT_LEVEL = 'campanha'

/**
 * Filtro por palavra contida no título/nome, com nível selecionável (campanha, conjunto/grupo ou anúncio).
 */
export function NameContainsFilter({ value, onChange, onClear, childLevelLabel = 'Conjunto', compact = false }) {
  const level = value?.level || DEFAULT_LEVEL
  const text = value?.text ?? ''
  const active = Boolean(String(text).trim())

  const levels = NAME_CONTAINS_LEVELS.map((l) =>
    l.id === 'children' ? { ...l, label: childLevelLabel } : l
  )

  const handleLevelChange = (nextLevel) => {
    onChange({ level: nextLevel, text })
  }

  const handleTextChange = (nextText) => {
    onChange({ level, text: nextText })
  }

  const handleClear = () => {
    onClear()
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.02]',
        compact ? 'h-7 px-1' : 'h-8 px-1.5',
        active && 'border-brand/40 bg-brand/10'
      )}
    >
      <select
        value={level}
        onChange={(e) => handleLevelChange(e.target.value)}
        className={cn(
          'cursor-pointer border-0 bg-transparent text-muted-foreground outline-none',
          compact ? 'max-w-[5.5rem] text-[10px]' : 'max-w-[6.5rem] text-[11px]'
        )}
        aria-label="Nível do filtro por título"
      >
        {levels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
      <span className="h-3 w-px shrink-0 bg-white/10" aria-hidden />
      <input
        type="text"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Contém no título…"
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent text-white placeholder:text-muted-foreground outline-none',
          compact ? 'w-[7rem] text-[11px]' : 'w-[9rem] text-xs'
        )}
        aria-label="Palavra contida no título"
      />
      {active ? (
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 text-muted-foreground hover:text-white"
          aria-label="Limpar filtro por título"
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  )
}
