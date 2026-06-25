import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampaignTree } from './CampaignTree'

const tree = [
  {
    id: 'c1', name: 'Camp Ativa', effectiveStatus: 'ACTIVE', objective: 'LEADS', dailyBudget: 25,
    metrics: { spend: 248.14, results: 5, ctrLink: 2.08, cpm: 60.77 },
    adsets: [
      {
        id: 's1', name: 'Conjunto 1', effectiveStatus: 'ACTIVE', objective: 'LEADS', dailyBudget: 35,
        metrics: { spend: 248.14, results: 5, ctrLink: 2.08, cpm: 60.77 },
        ads: [
          { id: 'a1', name: 'AD001', effectiveStatus: 'ACTIVE', objective: 'LEADS', thumbnailUrl: null, metrics: { spend: 246.71, results: 5, ctrLink: 2.09, cpm: 60 } },
        ],
      },
    ],
  },
  {
    id: 'c2', name: 'Camp Problema', effectiveStatus: 'DISAPPROVED', objective: 'LEADS', dailyBudget: 0,
    metrics: { spend: 0, results: 0, ctrLink: 0, cpm: 0 }, adsets: [],
  },
]

describe('CampaignTree', () => {
  it('renders campaign rows with status color classes', () => {
    render(<CampaignTree tree={tree} onToggleStatus={() => {}} />)
    expect(screen.getByText('Camp Ativa').closest('[data-status]')).toHaveAttribute('data-status', 'success')
    expect(screen.getByText('Camp Problema').closest('[data-status]')).toHaveAttribute('data-status', 'danger')
  })

  it('expands a campaign to reveal conjuntos and adsets', async () => {
    render(<CampaignTree tree={tree} onToggleStatus={() => {}} />)
    expect(screen.queryByText('Conjunto 1')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /expandir Camp Ativa/i }))
    expect(screen.getByText('Conjuntos')).toBeInTheDocument()
    expect(screen.getByText('Conjunto 1')).toBeInTheDocument()
    expect(screen.getByText(/Anúncios \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText('AD001')).toBeInTheDocument()
  })

  it('calls onToggleStatus with node info when a switch is toggled', async () => {
    const onToggle = vi.fn()
    render(<CampaignTree tree={tree} onToggleStatus={onToggle} />)
    const row = screen.getByText('Camp Ativa').closest('[data-status]')
    await userEvent.click(within(row).getByRole('switch'))
    expect(onToggle).toHaveBeenCalledWith({ level: 'campaign', id: 'c1', name: 'Camp Ativa', nextStatus: 'PAUSED' })
  })

  it('aceita labels custom e resultsLabel (Google)', async () => {
    render(
      <CampaignTree
        tree={tree}
        onToggleStatus={() => {}}
        labels={{ adsets: 'Grupos de anúncios', ads: 'Anúncios' }}
        resultsLabel="Conversões"
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /expandir Camp Ativa/i }))
    expect(screen.getByText('Grupos de anúncios')).toBeInTheDocument()
    expect(screen.getAllByText('Conversões').length).toBeGreaterThan(0)
  })

  it('mostra palavras-chave em campanhas Search (Google)', async () => {
    const searchTree = [
      {
        id: 'c1',
        name: 'Camp Search',
        effectiveStatus: 'ACTIVE',
        objective: 'SEARCH',
        dailyBudget: 0,
        metrics: { spend: 100, results: 2, ctrLink: 5, cpm: 10, impressions: 1000, clicks: 50 },
        adsets: [
          {
            id: 's1',
            name: 'Grupo Cyrela',
            effectiveStatus: 'ACTIVE',
            objective: '',
            dailyBudget: 0,
            metrics: { spend: 100, results: 2, ctrLink: 5, cpm: 10, impressions: 1000, clicks: 50 },
            ads: [],
            keywords: [
              {
                id: 'k1',
                keyword: 'cyrela apartamento',
                matchType: 'EXACT',
                metrics: { spend: 80, results: 2, ctrLink: 6, cpm: 8, impressions: 800, clicks: 48 },
              },
              {
                id: 'k2',
                keyword: 'apartamento zona sul',
                matchType: 'PHRASE',
                metrics: { spend: 20, results: 0, ctrLink: 3, cpm: 5, impressions: 200, clicks: 2 },
              },
            ],
          },
        ],
      },
    ]
    render(
      <CampaignTree tree={searchTree} onToggleStatus={() => {}} platform="google" labels={{ keywords: 'Palavras-chave' }} />
    )
    await userEvent.click(screen.getByRole('button', { name: /expandir Camp Search/i }))
    expect(screen.getByText('Palavras-chave (2)')).toBeInTheDocument()
    expect(screen.getByLabelText('Ordenar palavras-chave')).toBeInTheDocument()
    expect(screen.getByText('cyrela apartamento')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Ordenar palavras-chave'), 'clicks')
    expect(screen.getByLabelText('Ordenar palavras-chave')).toHaveValue('clicks')
    expect(screen.getByText('Exata')).toBeInTheDocument()
    expect(screen.getAllByText('Conversões').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Custo/conv.').length).toBeGreaterThan(0)
  })
})
