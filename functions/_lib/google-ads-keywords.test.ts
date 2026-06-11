import { describe, expect, it } from 'vitest'
import { aggregateSearchTerms, aggregateTopKeywords, aggregateKeywordsByAdGroup } from './google-ads-keywords'

function kwRow({
  text = 'apartamento sp',
  matchType = 'BROAD',
  campaignId = '1',
  campaignName = 'Campanha A',
  adGroupId = '10',
  adGroupName = 'Grupo 1',
  costMicros = 0,
  impressions = 0,
  clicks = 0,
  conversions = 0,
  absTop = undefined as number | undefined,
  top = undefined as number | undefined,
} = {}) {
  return {
    campaign: { id: campaignId, name: campaignName },
    adGroup: { id: adGroupId, name: adGroupName },
    adGroupCriterion: { keyword: { text, matchType } },
    metrics: {
      costMicros: String(costMicros),
      impressions: String(impressions),
      clicks: String(clicks),
      conversions,
      ...(absTop !== undefined ? { absoluteTopImpressionPercentage: absTop } : {}),
      ...(top !== undefined ? { topImpressionPercentage: top } : {}),
    },
  }
}

describe('aggregateTopKeywords', () => {
  it('agrega por campanha+palavra e pondera % por impressões', () => {
    const items = aggregateTopKeywords([
      kwRow({ impressions: 100, clicks: 10, costMicros: 5_000_000, absTop: 0.5, top: 0.8 }),
      kwRow({ adGroupName: 'Grupo 2', impressions: 300, clicks: 20, costMicros: 7_000_000, absTop: 0.9, top: 1 }),
    ])
    expect(items).toHaveLength(1)
    const it0 = items[0]
    expect(it0.keyword).toBe('apartamento sp')
    expect(it0.spend).toBeCloseTo(12)
    expect(it0.impressions).toBe(400)
    expect(it0.clicks).toBe(30)
    // (0.5*100 + 0.9*300) / 400 = 0.8 → 80%
    expect(it0.absTopPct).toBeCloseTo(80)
    expect(it0.topPct).toBeCloseTo(95)
    expect(it0.absTopImpressions).toBe(320)
  })

  it('mesma palavra em campanhas diferentes vira linhas separadas', () => {
    const items = aggregateTopKeywords([
      kwRow({ campaignId: '1', campaignName: 'A', impressions: 10, costMicros: 1_000_000 }),
      kwRow({ campaignId: '2', campaignName: 'B', impressions: 10, costMicros: 2_000_000 }),
    ])
    expect(items).toHaveLength(2)
    expect(items[0].campaignName).toBe('B') // maior gasto primeiro
  })

  it('campo de % omitido (proto3 zero) conta como 0% no ponderado', () => {
    const items = aggregateTopKeywords([
      kwRow({ impressions: 100, absTop: 1 }),
      kwRow({ adGroupName: 'G2', impressions: 100 }), // sem absTop → 0
    ])
    expect(items[0].absTopPct).toBeCloseTo(50)
  })

  it('descarta linhas totalmente zeradas, ordena por gasto e respeita limit', () => {
    const rows = [
      kwRow({ text: 'zerada' }),
      kwRow({ text: 'kw b', campaignId: '2', costMicros: 2_000_000, impressions: 1 }),
      kwRow({ text: 'kw c', campaignId: '3', costMicros: 3_000_000, impressions: 1 }),
      kwRow({ text: 'kw a', campaignId: '4', costMicros: 1_000_000, impressions: 1 }),
    ]
    const items = aggregateTopKeywords(rows, 2)
    expect(items.map((i) => i.keyword)).toEqual(['kw c', 'kw b'])
  })

  it('custo/conversão null sem conversões', () => {
    const [item] = aggregateTopKeywords([kwRow({ costMicros: 5_000_000, impressions: 10 })])
    expect(item.costPerConversion).toBeNull()
    const [item2] = aggregateTopKeywords([
      kwRow({ costMicros: 6_000_000, impressions: 10, conversions: 2 }),
    ])
    expect(item2.costPerConversion).toBeCloseTo(3)
  })
})

describe('aggregateKeywordsByAdGroup', () => {
  it('agrupa por ad group e ordena por gasto', () => {
    const map = aggregateKeywordsByAdGroup([
      kwRow({ adGroupId: '10', text: 'cyrela', costMicros: 2_000_000, impressions: 100, clicks: 8 }),
      kwRow({ adGroupId: '10', text: 'apartamento', costMicros: 5_000_000, impressions: 200, clicks: 12 }),
      kwRow({ adGroupId: '20', text: 'cyrela', costMicros: 1_000_000, impressions: 50, clicks: 3 }),
    ])
    expect(map.get('10')).toHaveLength(2)
    expect(map.get('10')![0].keyword).toBe('apartamento')
    expect(map.get('10')![0].metrics.spend).toBeCloseTo(5)
    expect(map.get('10')![0].metrics.impressions).toBe(200)
    expect(map.get('10')![0].metrics.clicks).toBe(12)
    expect(map.get('20')).toHaveLength(1)
  })
})

function termRow({
  term = 'apartamento perto de mim',
  campaignName = 'Campanha A',
  costMicros = 0,
  impressions = 0,
  clicks = 0,
  conversions = 0,
} = {}) {
  return {
    campaign: { name: campaignName },
    searchTermView: { searchTerm: term },
    metrics: {
      costMicros: String(costMicros),
      impressions: String(impressions),
      clicks: String(clicks),
      conversions,
    },
  }
}

describe('aggregateSearchTerms', () => {
  it('agrega por termo e usa campanha de maior gasto', () => {
    const items = aggregateSearchTerms([
      termRow({ campaignName: 'A', costMicros: 1_000_000, clicks: 1, impressions: 5 }),
      termRow({ campaignName: 'B', costMicros: 3_000_000, clicks: 2, impressions: 10 }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].campaignName).toBe('B')
    expect(items[0].spend).toBeCloseTo(4)
    expect(items[0].clicks).toBe(3)
    expect(items[0].impressions).toBe(15)
  })

  it('descarta termos só com impressões (sem clique/custo/conversão)', () => {
    const items = aggregateSearchTerms([
      termRow({ term: 'ruido', impressions: 3 }),
      termRow({ term: 'bom', clicks: 1, impressions: 2 }),
    ])
    expect(items.map((i) => i.term)).toEqual(['bom'])
  })

  it('ordena por gasto > conversões > cliques e respeita limit', () => {
    const items = aggregateSearchTerms(
      [
        termRow({ term: 'caro', costMicros: 9_000_000, clicks: 1 }),
        termRow({ term: 'converte', conversions: 3, clicks: 1 }),
        termRow({ term: 'clicado', clicks: 5 }),
        termRow({ term: 'fraco', clicks: 1 }),
      ],
      3
    )
    expect(items.map((i) => i.term)).toEqual(['caro', 'converte', 'clicado'])
  })
})
