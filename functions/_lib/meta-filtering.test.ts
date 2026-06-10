import { describe, expect, test } from 'vitest'
import { parseMetaDimensionFilters, metaFilteringQuery } from './meta-filtering'

describe('parseMetaDimensionFilters', () => {
  test('extrai ids', () => {
    const url = new URL('https://x/api?campaign_ids=1,2&adset_id=3&ad_id=4')
    expect(parseMetaDimensionFilters(url)).toEqual({ campaignIds: ['1', '2'], adsetId: '3', adId: '4' })
  })

  test('descarta não numéricos', () => {
    const url = new URL('https://x/api?campaign_ids=1,abc&adset_id=x')
    expect(parseMetaDimensionFilters(url)).toEqual({ campaignIds: ['1'], adsetId: null, adId: null })
  })
})

describe('metaFilteringQuery', () => {
  test('vazio sem filtros', () => {
    expect(metaFilteringQuery({ campaignIds: [], adsetId: null, adId: null })).toBe('')
  })

  test('monta filtering JSON com IN', () => {
    const q = metaFilteringQuery({ campaignIds: ['1', '2'], adsetId: null, adId: null })
    expect(q).toContain('&filtering=')
    const parsed = JSON.parse(decodeURIComponent(q.replace('&filtering=', '')))
    expect(parsed).toEqual([{ field: 'campaign.id', operator: 'IN', values: ['1', '2'] }])
  })

  test('adset e ad entram como filtros adicionais', () => {
    const q = metaFilteringQuery({ campaignIds: [], adsetId: '3', adId: '4' })
    const parsed = JSON.parse(decodeURIComponent(q.replace('&filtering=', '')))
    expect(parsed).toEqual([
      { field: 'adset.id', operator: 'IN', values: ['3'] },
      { field: 'ad.id', operator: 'IN', values: ['4'] },
    ])
  })
})
