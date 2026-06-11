import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { getPreviousPeriodOfSameLength } from '@/lib/dateRange'

const DashboardFiltersContext = createContext(null)

function initialMainRange() {
  const end = endOfDay(new Date())
  const start = startOfDay(subDays(end, 29))
  return { start, end }
}

export function DashboardFiltersProvider({ children }) {
  const [dateRange, setDateRange] = useState(initialMainRange)
  const [compareDateRange, setCompareDateRange] = useState(() => {
    const main = initialMainRange()
    return getPreviousPeriodOfSameLength(main.start, main.end)
  })
  const [comparePrimaryKpi, setComparePrimaryKpi] = useState(false)
  /** Modo apresentação: esconde navegação/filtros para exibir só os blocos (relatórios ao vivo/print). */
  const [presentationMode, setPresentationMode] = useState(false)
  const [dimensionFilters, setDimensionFilters] = useState({})
  /** Filtros locais do bloco Campanhas Google Ads (persistem ao trocar aba / recarregar dados). */
  const [googleCampaignBlockFilters, setGoogleCampaignBlockFilters] = useState({})
  /** Opções publicadas pela página ativa a partir da árvore do overview: { [key]: [{id,name,...}] } */
  const [filterOptions, setFilterOptions] = useState({})

  const previousPeriod = useMemo(
    () => getPreviousPeriodOfSameLength(dateRange.start, dateRange.end),
    [dateRange.start, dateRange.end]
  )

  useEffect(() => {
    setCompareDateRange(getPreviousPeriodOfSameLength(dateRange.start, dateRange.end))
  }, [dateRange.start, dateRange.end])

  const setDateRangeSafe = useCallback((next) => {
    setDateRange((prev) => {
      const n = typeof next === 'function' ? next(prev) : next
      if (!n?.start || !n?.end) return prev
      return { start: startOfDay(n.start), end: endOfDay(n.end) }
    })
  }, [])

  const setCompareDateRangeSafe = useCallback((next) => {
    setCompareDateRange((prev) => {
      const n = typeof next === 'function' ? next(prev) : next
      if (!n?.start || !n?.end) return prev
      return { start: startOfDay(n.start), end: endOfDay(n.end) }
    })
  }, [])

  const value = useMemo(
    () => ({
      dateRange,
      setDateRange: setDateRangeSafe,
      compareDateRange,
      setCompareDateRange: setCompareDateRangeSafe,
      comparePrimaryKpi,
      setComparePrimaryKpi,
      presentationMode,
      setPresentationMode,
      previousPeriod,
      dimensionFilters,
      setDimensionFilters,
      googleCampaignBlockFilters,
      setGoogleCampaignBlockFilters,
      filterOptions,
      setFilterOptions,
    }),
    [
      dateRange,
      setDateRangeSafe,
      compareDateRange,
      setCompareDateRangeSafe,
      comparePrimaryKpi,
      presentationMode,
      previousPeriod,
      dimensionFilters,
      googleCampaignBlockFilters,
      filterOptions,
    ]
  )

  return <DashboardFiltersContext.Provider value={value}>{children}</DashboardFiltersContext.Provider>
}

export function useDashboardFilters() {
  const ctx = useContext(DashboardFiltersContext)
  if (!ctx) {
    throw new Error('useDashboardFilters must be used within DashboardFiltersProvider')
  }
  return ctx
}

/** Para componentes que podem existir fora do provider (testes / story). */
export function useDashboardFiltersOptional() {
  return useContext(DashboardFiltersContext)
}
