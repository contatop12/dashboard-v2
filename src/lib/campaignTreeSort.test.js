import { describe, expect, it } from 'vitest'
import {
  applyCampaignViewFilters,
  applyTopSpendFilter,
  sortCampaignNodes,
  sortKeywordNodes,
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

  it('mantém top N por investimento', () => {
    const out = applyTopSpendFilter(rows, 2)
    expect(out).toHaveLength(2)
    expect(out.map((r) => r.id)).toEqual(['2', '1'])
  })

  it('ordena palavras-chave por cliques decrescente', () => {
    const keywords = [
      { id: 'k1', keyword: 'alpha', metrics: { spend: 10, clicks: 5 } },
      { id: 'k2', keyword: 'beta', metrics: { spend: 80, clicks: 47 } },
      { id: 'k3', keyword: 'gamma', metrics: { spend: 20, clicks: 9 } },
    ]
    const sorted = sortKeywordNodes(keywords, 'clicks', true)
    expect(sorted.map((k) => k.id)).toEqual(['k2', 'k3', 'k1'])
  })

  it('ordena palavras-chave por texto crescente', () => {
    const keywords = [
      { id: 'k1', keyword: 'zona sul', metrics: { spend: 1 } },
      { id: 'k2', keyword: 'apartamento', metrics: { spend: 2 } },
    ]
    const sorted = sortKeywordNodes(keywords, 'keyword', false)
    expect(sorted.map((k) => k.keyword)).toEqual(['apartamento', 'zona sul'])
  })
})
