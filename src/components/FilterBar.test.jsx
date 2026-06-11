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

  test('Google Ads expõe filtros de anúncio, palavra-chave e status (sem campanha no topo)', () => {
    renderWithOptions('Google Ads', {
      campanha: [{ id: '1', name: 'Camp Test' }],
      ads: [{ id: '11~99', name: 'Anúncio RSA' }],
      keywords: [{ id: '11~kw', name: 'cyrela' }],
      status: [{ id: 'ACTIVE', name: 'Ativas' }],
    })
    expect(screen.queryByRole('button', { name: /^Campanha$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Grupo de Anúncios$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Tipo de campanha$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Anúncio$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Palavra-chave$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Status$/i })).toBeInTheDocument()
  })
})
