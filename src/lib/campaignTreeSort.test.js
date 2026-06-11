import { describe, expect, it } from 'vitest'
import {
  applyCampaignViewFilters,
  sortCampaignNodes,
} from './campaignTreeSort'

const rows = [
  { id: '1', name: 'Beta', metrics: { spend: 50, results: 0, impressions: 100, clicks: 5 } },
  { id: '2', name: 'Alpha', metrics: { spend: 200, results: 10, impressions: 500, clicks: 20 } },
  { id: '3', name: 'Gamma', metrics: { spend: 0, results: 0, impressions: 0, clicks: 0 } },
]

describe('campaignTreeSort', () => {
  it('ordena por investimento decrescente', () => {
    const sorted = sortCampaignNodes(rows, 'spend', true)
    expect(sorted.map((r) => r.id)).toEqual(['2', '1', '3'])
  })

  it('ordena por nome crescente', () => {
    const sorted = sortCampaignNodes(rows, 'name', false)
    expect(sorted.map((r) => r.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('filtra campanhas com gasto', () => {
    const out = applyCampaignViewFilters(rows, { onlyWithSpend: true })
    expect(out).toHaveLength(2)
    expect(out.every((r) => (r.metrics?.spend || 0) > 0)).toBe(true)
  })
})
