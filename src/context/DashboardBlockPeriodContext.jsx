import { createContext, useContext } from 'react'

/** 'current' = período selecionado; 'previous' = período comparado (mesma duração, antes). */
export const DashboardBlockPeriodContext = createContext('current')

export function useDashboardBlockPeriod() {
  return useContext(DashboardBlockPeriodContext)
}
