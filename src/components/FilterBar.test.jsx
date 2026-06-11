import { useEffect } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterBar from './FilterBar'
import { DashboardFiltersProvider, useDashboardFilters } from '@/context/DashboardFiltersContext'

vi.mock('@/context/OrgWorkspaceContext', () => ({
  useOrgWorkspace: () => ({ activeOrgId: 'org1' }),
}))

function renderWithOptions(page, options) {
  function Publisher() {
    const { setFilterOptions } = useDashboardFilters()
    useEffect(() => {
      setFilterOptions(options)
    }, [setFilterOptions])
    return <FilterBar activePage={page} />
  }
  return render(
    <DashboardFiltersProvider>
      <Publisher />
    </DashboardFiltersProvider>
  )
}

describe('FilterBar', () => {
  test('Geral mostra só data (sem selects de dimensão)', () => {
    renderWithOptions('Geral', {})
    expect(screen.queryByText('Campanha')).not.toBeInTheDocument()
  })

  test('Meta Ads lista campanhas reais publicadas no contexto', async () => {
    renderWithOptions('Meta Ads', { campanha: [{ id: '1', name: 'Camp Real' }] })
    await userEvent.click(screen.getByRole('button', { name: /^Campanha$/i }))
    expect(screen.getByText('Camp Real')).toBeInTheDocument()
  })

  test('seleção mostra botão limpar filtros', async () => {
    renderWithOptions('Meta Ads', { campanha: [{ id: '1', name: 'Camp Real' }] })
    await userEvent.click(screen.getByRole('button', { name: /^Campanha$/i }))
    await userEvent.click(screen.getByText('Camp Real'))
    expect(screen.getByRole('button', { name: /limpar filtros/i })).toBeInTheDocument()
  })

  test('busca aparece em listas longas e filtra', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: `Campanha ${i}` }))
    renderWithOptions('Meta Ads', { campanha: many })
    await userEvent.click(screen.getByRole('button', { name: /^Campanha$/i }))
    const search = screen.getByPlaceholderText('Buscar…')
    await userEvent.type(search, 'Campanha 7')
    expect(screen.getByText('Campanha 7')).toBeInTheDocument()
    expect(screen.queryByText('Campanha 3')).not.toBeInTheDocument()
  })

  test('Google Ads expõe filtros de anúncio e palavra-chave (status fica no bloco de campanhas)', () => {
    renderWithOptions('Google Ads', {
      ads: [{ id: '11~99', name: 'Anúncio RSA' }],
      keywords: [{ id: '11~kw', name: 'cyrela' }],
      status: [{ id: 'ACTIVE', name: 'Ativas' }],
    })
    expect(screen.queryByRole('button', { name: /^Status$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Anúncio$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Palavra-chave$/i })).toBeInTheDocument()
  })
})
