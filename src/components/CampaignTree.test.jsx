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

  it('expands a campaign to reveal its adsets', async () => {
    render(<CampaignTree tree={tree} onToggleStatus={() => {}} />)
    expect(screen.queryByText('Conjunto 1')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /expandir Camp Ativa/i }))
    expect(screen.getByText('Conjunto 1')).toBeInTheDocument()
  })

  it('calls onToggleStatus with node info when a switch is toggled', async () => {
    const onToggle = vi.fn()
    render(<CampaignTree tree={tree} onToggleStatus={onToggle} />)
    const row = screen.getByText('Camp Ativa').closest('[data-status]')
    await userEvent.click(within(row).getByRole('switch'))
    expect(onToggle).toHaveBeenCalledWith({ level: 'campaign', id: 'c1', name: 'Camp Ativa', nextStatus: 'PAUSED' })
  })
})
