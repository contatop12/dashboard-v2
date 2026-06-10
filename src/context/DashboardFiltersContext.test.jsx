import { describe, expect, test } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { DashboardFiltersProvider, useDashboardFilters } from './DashboardFiltersContext'

const wrapper = ({ children }) => <DashboardFiltersProvider>{children}</DashboardFiltersProvider>

describe('filterOptions', () => {
  test('começa vazio e aceita publicação', () => {
    const { result } = renderHook(() => useDashboardFilters(), { wrapper })
    expect(result.current.filterOptions).toEqual({})
    act(() => result.current.setFilterOptions({ campanha: [{ id: '1', name: 'Camp A' }] }))
    expect(result.current.filterOptions.campanha).toHaveLength(1)
  })

  test('dimensionFilters guarda objetos {id,name}', () => {
    const { result } = renderHook(() => useDashboardFilters(), { wrapper })
    act(() => result.current.setDimensionFilters({ campanha: { id: '1', name: 'Camp A' } }))
    expect(result.current.dimensionFilters.campanha.id).toBe('1')
  })
})
