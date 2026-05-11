import { useEffect, useState, useRef } from 'react'
import { endOfDay, format, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Calendar, ChevronDown, RefreshCw, Columns2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { defaultCompareSevenDaysBeforeMain, rangeLastNDays, rangeThisMonth } from '@/lib/dateRange'

// Filter configs per page
const PAGE_FILTERS = {
  Geral: ['dateRange', 'campanha', 'grupoAnuncios', 'palavrasChave', 'objetivo'],
  'Meta Ads': ['dateRange', 'campanha', 'conjuntoAnuncios', 'anuncio', 'objetivo', 'posicionamento'],
  'Google Ads': ['dateRange', 'campanha', 'grupoAnuncios', 'palavrasChave', 'tipoCampanha'],
  'Google Meu Negócio': ['dateRange', 'local'],
  Instagram: ['dateRange', 'perfil', 'tipoConteudo'],
  Campanhas: ['dateRange', 'campanha', 'objetivo'],
  Anúncios: ['dateRange', 'campanha', 'tipoAnuncio'],
  'Palavras-chave': ['dateRange', 'campanha', 'palavrasChave', 'tipoCorrespondencia'],
  Relatórios: ['dateRange'],
  Configurações: [],
}

/** Páginas com faixa de KPIs primários no DashboardGrid (toggle de comparação). */
const DASHBOARD_KPI_PAGES = new Set(['Geral', 'Meta Ads', 'Google Ads', 'Google Meu Negócio', 'Instagram'])

const DATE_PRESETS = [
  { key: '7d', label: 'Últimos 7 dias', getRange: () => rangeLastNDays(7) },
  { key: '30d', label: 'Últimos 30 dias', getRange: () => rangeLastNDays(30) },
  { key: 'month', label: 'Este mês', getRange: () => rangeThisMonth() },
]

const FILTER_OPTIONS = {
  campanha: { label: 'Campanha', options: ['Todas', 'Campanha_Leads_SP', 'Campanha_Retarget_RJ', 'Campanha_Brand_MG'] },
  grupoAnuncios: { label: 'Grupo de Anúncios', options: ['Todos', 'Grupo_Prospeccao', 'Grupo_Retargeting'] },
  palavrasChave: { label: 'Palavras-chave', options: ['Todas', 'consultoria financeira', 'planejamento financeiro'] },
  objetivo: { label: 'Objetivo', options: ['Todos', 'Geração de Leads', 'Conversão', 'Tráfego', 'Reconhecimento'] },
  conjuntoAnuncios: { label: 'Conjunto de Anúncios', options: ['Todos', 'Conj_Prospeccao', 'Conj_Retargeting', 'Conj_Lookalike'] },
  anuncio: { label: 'Anúncio', options: ['Todos', 'Carrossel_01', 'Video_30s', 'Imagem_Estatica'] },
  posicionamento: { label: 'Posicionamento', options: ['Todos', 'Feed', 'Stories', 'Reels', 'Audience Network'] },
  tipoCampanha: { label: 'Tipo', options: ['Todos', 'Search', 'Display', 'Performance Max', 'Video', 'Shopping'] },
  local: { label: 'Local', options: ['Todos os Locais', 'São Paulo - Centro', 'São Paulo - Zona Sul'] },
  perfil: { label: 'Perfil', options: ['@p12digital', '@p12empresa'] },
  tipoConteudo: { label: 'Tipo de Conteúdo', options: ['Todos', 'Feed', 'Stories', 'Reels', 'IGTV'] },
  tipoAnuncio: { label: 'Tipo de Anúncio', options: ['Todos', 'Search', 'Display', 'Video'] },
  tipoCorrespondencia: { label: 'Correspondência', options: ['Todas', 'Exata', 'Frase', 'Ampla'] },
}

function FilterSelect({ filterKey, value, onChange, optionsOverride }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const config = FILTER_OPTIONS[filterKey]
  if (!config) return null
  const options = optionsOverride ?? config.options

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('pointerdown', close, true)
    return () => window.removeEventListener('pointerdown', close, true)
  }, [open])

  return (
    <div className="relative z-[60]" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="filter-select"
      >
        <span className="text-white max-w-[140px] truncate">{value || config.label}</span>
        <ChevronDown size={10} className="text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 max-h-60 overflow-y-auto bg-surface-card border border-surface-border rounded-lg shadow-xl z-[70] min-w-[180px] py-2 animate-scale-in">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(filterKey, opt)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-4 py-2 text-xs hover:bg-surface-hover transition-colors',
                value === opt ? 'text-brand' : 'text-white'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FilterBar({ activePage }) {
  const { activeOrgId } = useOrgWorkspace()
  const {
    dateRange,
    setDateRange,
    compareDateRange,
    setCompareDateRange,
    comparePrimaryKpi,
    setComparePrimaryKpi,
    dimensionFilters,
    setDimensionFilters,
  } = useDashboardFilters()
  const [metaLive, setMetaLive] = useState(null)
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

  useEffect(() => {
    if (activePage !== 'Meta Ads' || !activeOrgId) {
      setMetaLive(null)
      return
    }
    let cancelled = false
    fetch(`/api/orgs/${activeOrgId}/meta-ads-filters`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMetaLive(d)
      })
      .catch(() => {
        if (!cancelled) setMetaLive(null)
      })
    return () => {
      cancelled = true
    }
  }, [activePage, activeOrgId])

  useEffect(() => {
    const refetch = () => {
      if (activePage !== 'Meta Ads' || !activeOrgId) return
      fetch(`/api/orgs/${activeOrgId}/meta-ads-filters`, { credentials: 'include' })
        .then((r) => r.json())
        .then(setMetaLive)
        .catch(() => setMetaLive(null))
    }
    window.addEventListener('p12-account-selection-changed', refetch)
    return () => window.removeEventListener('p12-account-selection-changed', refetch)
  }, [activePage, activeOrgId])

  const metaOptionsFor = (key) => {
    if (activePage !== 'Meta Ads' || !metaLive) return undefined
    const m = {
      campanha: metaLive.campanha,
      conjuntoAnuncios: metaLive.conjuntoAnuncios,
      anuncio: metaLive.anuncio,
      objetivo: metaLive.objetivo,
      posicionamento: metaLive.posicionamento,
    }
    return m[key]
  }

  if (activeFilters.length === 0) return null

  const handleRefresh = async () => {
    setRefreshing(true)
    if (activePage === 'Meta Ads' && activeOrgId) {
      try {
        const r = await fetch(`/api/orgs/${activeOrgId}/meta-ads-filters`, { credentials: 'include' })
        const data = await r.json()
        setMetaLive(data)
      } catch {
        setMetaLive(null)
      }
    }
    setTimeout(() => setRefreshing(false), 800)
  }

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
                <Calendar size={11} className="text-muted-foreground shrink-0" />
                <span className="text-white text-xs hidden sm:block truncate">{rangeLabelLong}</span>
                <span className="text-white text-xs sm:hidden truncate">{rangeLabelShort}</span>
                <ChevronDown size={10} className="text-muted-foreground shrink-0" />
              </button>
              {dateOpen && (
                <div className="absolute top-full left-0 z-[70] mt-2 rounded-lg border border-surface-border bg-surface-card p-3 shadow-xl animate-scale-in">
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
                  <div className="rdp-dark text-[#e5e5e5] [--rdp-accent-color:#F5C518] [--rdp-background-color:#1a1a1a]">
                    <DayPicker
                      mode="range"
                      numberOfMonths={2}
                      locale={ptBR}
                      defaultMonth={dateRange.start}
                      selected={{ from: dateRange.start, to: dateRange.end }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ start: startOfDay(range.from), end: endOfDay(range.to) })
                          setDateOpen(false)
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            {showKpiCompare && (
              <>
                <button
                  type="button"
                  aria-pressed={comparePrimaryKpi}
                  onClick={() => setComparePrimaryKpi((v) => !v)}
                  title="Comparar KPIs do período principal com outro intervalo (calendário ao lado). Padrão: 7 dias antes do início do período atual."
                  className={cn(
                    'filter-select shrink-0',
                    comparePrimaryKpi && 'border-brand/40 bg-brand/10 text-brand'
                  )}
                >
                  <Columns2 size={11} className={comparePrimaryKpi ? 'text-brand' : 'text-muted-foreground'} />
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
                      <Calendar size={11} className="text-muted-foreground shrink-0" />
                      <span className="truncate text-xs text-white">vs {compareLabelShort}</span>
                      <ChevronDown size={10} className="text-muted-foreground shrink-0" />
                    </button>
                    {compareDateOpen && (
                      <div className="absolute top-full left-0 z-[70] mt-2 rounded-lg border border-surface-border bg-surface-card p-3 shadow-xl animate-scale-in">
                        <button
                          type="button"
                          onClick={() => {
                            setCompareDateRange(defaultCompareSevenDaysBeforeMain(dateRange.start))
                            setCompareDateOpen(false)
                          }}
                          className="mb-2 w-full rounded border border-surface-border px-2 py-1.5 text-left text-[10px] text-white hover:bg-surface-hover"
                        >
                          Padrão: 7 dias antes do período principal
                        </button>
                        <div className="rdp-dark text-[#e5e5e5] [--rdp-accent-color:#F5C518] [--rdp-background-color:#1a1a1a]">
                          <DayPicker
                            mode="range"
                            numberOfMonths={2}
                            locale={ptBR}
                            defaultMonth={compareDateRange.start}
                            selected={{ from: compareDateRange.start, to: compareDateRange.end }}
                            onSelect={(range) => {
                              if (range?.from && range?.to) {
                                setCompareDateRange({
                                  start: startOfDay(range.from),
                                  end: endOfDay(range.to),
                                })
                                setCompareDateOpen(false)
                              }
                            }}
                          />
                        </div>
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
              <FilterSelect
                key={filterKey}
                filterKey={filterKey}
                value={dimensionFilters[filterKey] || ''}
                optionsOverride={metaOptionsFor(filterKey)}
                onChange={(key, val) =>
                  setDimensionFilters((prev) => ({
                    ...prev,
                    [key]: val,
                  }))
                }
              />
            ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-surface-card hover:text-white"
            title="Atualizar opções da Meta (quando houver organização selecionada)"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  )
}
