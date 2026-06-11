import { useEffect, useState, useRef } from 'react'
import { endOfDay, format, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '@/styles/datepicker-p12.css'
import { Calendar, ChevronDown, RefreshCw, Columns2, X, Presentation } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DimensionFilterSelect } from '@/components/ui/DimensionFilterSelect'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import {
  rangeLastMonth,
  rangeLastNDays,
  rangeThisMonth,
  getPreviousPeriodOfSameLength,
} from '@/lib/dateRange'

registerLocale('pt-BR', ptBR)

/**
 * Filtros por página — só chaves com dados reais (opções publicadas pela página
 * no DashboardFiltersContext a partir da árvore do overview).
 */
const PAGE_FILTERS = {
  Geral: ['dateRange'],
  'Meta Ads': ['dateRange', 'campanha', 'children', 'ads', 'objetivo'],
  'Google Ads': ['dateRange', 'ads', 'keywords', 'status'],
  'Google Meu Negócio': ['dateRange'],
  Instagram: ['dateRange'],
  Configurações: [],
  Clientes: [],
}

const FILTER_LABELS = {
  campanha: { default: 'Campanha' },
  children: { 'Meta Ads': 'Conjunto de Anúncios', 'Google Ads': 'Grupo de Anúncios', default: 'Grupo' },
  ads: { default: 'Anúncio' },
  keywords: { 'Google Ads': 'Palavra-chave', default: 'Palavra-chave' },
  objetivo: { 'Google Ads': 'Tipo de campanha', default: 'Objetivo' },
  status: { 'Google Ads': 'Status', default: 'Status' },
}

function filterLabel(filterKey, activePage) {
  const cfg = FILTER_LABELS[filterKey]
  if (!cfg) return filterKey
  return cfg[activePage] ?? cfg.default ?? filterKey
}

/** Páginas com faixa de KPIs primários no DashboardGrid (toggle de comparação). */
const DASHBOARD_KPI_PAGES = new Set(['Geral', 'Meta Ads', 'Google Ads', 'Google Meu Negócio', 'Instagram'])

const DATE_PRESETS = [
  { key: '7d', label: 'Últimos 7 dias', getRange: () => rangeLastNDays(7) },
  { key: '14d', label: 'Últimos 14 dias', getRange: () => rangeLastNDays(14) },
  { key: '30d', label: 'Últimos 30 dias', getRange: () => rangeLastNDays(30) },
  { key: '90d', label: 'Últimos 90 dias', getRange: () => rangeLastNDays(90) },
  { key: 'month', label: 'Este mês', getRange: () => rangeThisMonth() },
  { key: 'last-month', label: 'Mês passado', getRange: () => rangeLastMonth() },
]

/**
 * Estado local enquanto o popover está aberto: no 1º clique vem [início, null].
 * Se gravarmos isso no contexto como um só dia, o datepicker acha o intervalo “fechado” e o 2º clique reinicia.
 */
function InlineRangePicker({ open, committedRange, openToDate, onComplete }) {
  const [dates, setDates] = useState(() => [committedRange.start, committedRange.end])

  useEffect(() => {
    if (open) {
      setDates([committedRange.start, committedRange.end])
    }
  }, [open, committedRange.start, committedRange.end])

  const handleChange = (update) => {
    if (!update) return
    const [start, end] = update
    setDates(update)
    if (start && end) {
      const from = start <= end ? start : end
      const to = start <= end ? end : start
      onComplete({ start: startOfDay(from), end: endOfDay(to) })
    }
  }

  const [start, end] = dates

  return (
    <div
      className="p12-range-datepicker overflow-x-auto"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <DatePicker
        selectsRange
        startDate={start}
        endDate={end ?? undefined}
        onChange={handleChange}
        inline
        monthsShown={2}
        locale="pt-BR"
        calendarStartDay={1}
        openToDate={openToDate ?? start}
        dateFormat="dd/MM/yyyy"
      />
    </div>
  )
}

export default function FilterBar({ activePage }) {
  const {
    dateRange,
    setDateRange,
    compareDateRange,
    setCompareDateRange,
    comparePrimaryKpi,
    setComparePrimaryKpi,
    setPresentationMode,
    dimensionFilters,
    setDimensionFilters,
    filterOptions,
    previousPeriod,
  } = useDashboardFilters()
  const [refreshing, setRefreshing] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [compareDateOpen, setCompareDateOpen] = useState(false)
  const dateMenuRef = useRef(null)
  const compareDateMenuRef = useRef(null)

  const activeFilters = PAGE_FILTERS[activePage] ?? ['dateRange']
  const showKpiCompare =
    DASHBOARD_KPI_PAGES.has(activePage) && activeFilters.includes('dateRange')

  const rangeLabelLong = `${format(dateRange.start, 'd MMM', { locale: ptBR })} – ${format(dateRange.end, 'd MMM yyyy', { locale: ptBR })}`
  const rangeLabelShort = `${format(dateRange.start, 'd MMM', { locale: ptBR })} – ${format(dateRange.end, 'MMM', { locale: ptBR })}`
  const compareLabelShort = `${format(compareDateRange.start, 'd MMM', { locale: ptBR })} – ${format(compareDateRange.end, 'd MMM', { locale: ptBR })}`

  useEffect(() => {
    setDimensionFilters({})
  }, [activePage, setDimensionFilters])

  useEffect(() => {
    if (!dateOpen) return
    const onDown = (e) => {
      if (dateMenuRef.current?.contains(e.target)) return
      setDateOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [dateOpen])

  useEffect(() => {
    if (!compareDateOpen) return
    const onDown = (e) => {
      if (compareDateMenuRef.current?.contains(e.target)) return
      setCompareDateOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [compareDateOpen])

  if (activeFilters.length === 0) return null

  const handleRefresh = () => {
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('p12-overview-refresh'))
    setTimeout(() => setRefreshing(false), 800)
  }

  const hasActiveDimensionFilters = Object.keys(dimensionFilters).length > 0

  return (
    <div className="shrink-0 flex flex-col border-b border-surface-border bg-[#0F0F0F]">
      <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
        {activeFilters.includes('dateRange') && (
          <>
            <div className="relative z-[60]" ref={dateMenuRef}>
              <button
                type="button"
                onClick={() => setDateOpen((o) => !o)}
                className="filter-select max-w-[min(100vw-8rem,280px)]"
              >
                <Calendar size={12} className="text-muted-foreground shrink-0" />
                <span className="text-white text-xs hidden sm:block truncate">{rangeLabelLong}</span>
                <span className="text-white text-xs sm:hidden truncate">{rangeLabelShort}</span>
                <ChevronDown size={12} className="text-muted-foreground shrink-0" />
              </button>
              {dateOpen && (
                <div
                  className="absolute top-full left-0 z-[70] mt-2 rounded-lg border border-surface-border bg-surface-card p-3 shadow-xl animate-scale-in"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="mb-2 flex flex-col gap-1 border-b border-surface-border pb-2">
                    {DATE_PRESETS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          setDateRange(p.getRange())
                          setDateOpen(false)
                        }}
                        className="w-full rounded px-2 py-1.5 text-left text-xs text-white hover:bg-surface-hover transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <InlineRangePicker
                    open={dateOpen}
                    committedRange={dateRange}
                    openToDate={dateRange.start}
                    onComplete={(next) => {
                      setDateRange(next)
                      setDateOpen(false)
                    }}
                  />
                </div>
              )}
            </div>
            {showKpiCompare && (
              <>
                <button
                  type="button"
                  aria-pressed={comparePrimaryKpi}
                  onClick={() => setComparePrimaryKpi((v) => !v)}
                  title="Comparar KPIs do período principal com outro intervalo (calendário ao lado). Padrão: período anterior com a mesma duração."
                  className={cn(
                    'filter-select shrink-0',
                    comparePrimaryKpi && 'border-brand/40 bg-brand/10 text-brand'
                  )}
                >
                  <Columns2 size={12} className={comparePrimaryKpi ? 'text-brand' : 'text-muted-foreground'} />
                  <span className="text-white text-xs hidden md:inline">Comparar KPIs</span>
                </button>
                {comparePrimaryKpi && (
                  <div className="relative z-[60]" ref={compareDateMenuRef}>
                    <button
                      type="button"
                      onClick={() => setCompareDateOpen((o) => !o)}
                      className="filter-select max-w-[min(100vw-10rem,220px)]"
                      title="Período usado na comparação (variação % e faixa inferior)"
                    >
                      <Calendar size={12} className="text-muted-foreground shrink-0" />
                      <span className="truncate text-xs text-white">vs {compareLabelShort}</span>
                      <ChevronDown size={12} className="text-muted-foreground shrink-0" />
                    </button>
                    {compareDateOpen && (
                      <div
                        className="absolute top-full left-0 z-[70] mt-2 rounded-lg border border-surface-border bg-surface-card p-3 shadow-xl animate-scale-in"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setCompareDateRange(previousPeriod)
                            setCompareDateOpen(false)
                          }}
                          className="mb-2 w-full rounded border border-surface-border px-2 py-1.5 text-left text-xs text-white hover:bg-surface-hover"
                        >
                          Período anterior (mesma duração)
                        </button>
                        <InlineRangePicker
                          open={compareDateOpen}
                          committedRange={compareDateRange}
                          openToDate={compareDateRange.start}
                          onComplete={(next) => {
                            setCompareDateRange(next)
                            setCompareDateOpen(false)
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <div className="mx-1 hidden h-4 w-px bg-surface-border sm:block" />
          </>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {activeFilters
            .filter((f) => f !== 'dateRange')
            .map((filterKey) => (
              <DimensionFilterSelect
                key={filterKey}
                filterKey={filterKey}
                label={filterLabel(filterKey, activePage)}
                value={dimensionFilters[filterKey] || null}
                options={filterOptions[filterKey]}
                onChange={(key, opt) => setDimensionFilters((prev) => ({ ...prev, [key]: opt }))}
                onClear={(key) =>
                  setDimensionFilters((prev) => {
                    const next = { ...prev }
                    delete next[key]
                    return next
                  })
                }
              />
            ))}
          {hasActiveDimensionFilters && (
            <button
              type="button"
              onClick={() => setDimensionFilters({})}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-white"
            >
              <X size={12} /> Limpar filtros
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPresentationMode(true)}
            className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-all hover:bg-surface-card hover:text-white"
            title="Modo apresentação: esconde menus e filtros para exibir só o relatório (Esc para sair)"
          >
            <Presentation size={14} />
            <span className="hidden lg:inline">Apresentar</span>
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-surface-card hover:text-white"
            title="Atualizar dados da página"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  )
}
