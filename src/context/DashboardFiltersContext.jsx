import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { getPreviousPeriodOfSameLength } from '@/lib/dateRange'

const DashboardFiltersContext = createContext(null)

export function DashboardFiltersProvider({ children }) {
  const [dateRange, setDateRange] = useState(() => {
    const end = endOfDay(new Date())
    const start = startOfDay(subDays(end, 29))
    return { start, end }
  })
  const [comparePrimaryKpi, setComparePrimaryKpi] = useState(false)
  const [dimensionFilters, setDimensionFilters] = useState({})

  const previousPeriod = useMemo(
    () => getPreviousPeriodOfSameLength(dateRange.start, dateRange.end),
    [dateRange.start, dateRange.end]
  )

  const setDateRangeSafe = useCallback((next) => {
    setDateRange((prev) => {
      const n = typeof next === 'function' ? next(prev) : next
      if (!n?.start || !n?.end) return prev
      return { start: startOfDay(n.start), end: endOfDay(n.end) }
    })
  }, [])

  const value = useMemo(
    () => ({
      dateRange,
      setDateRange: setDateRangeSafe,
      comparePrimaryKpi,
      setComparePrimaryKpi,
      previousPeriod,
      dimensionFilters,
      setDimensionFilters,
    }),
    [dateRange, setDateRangeSafe, comparePrimaryKpi, previousPeriod, dimensionFilters]
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
