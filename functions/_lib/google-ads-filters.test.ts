import { describe, expect, test } from 'vitest'
import { parseGoogleDimensionFilters, gaqlFilterClause } from './google-ads-filters'

describe('parseGoogleDimensionFilters', () => {
  test('extrai e sanitiza ids da URL', () => {
    const url = new URL('https://x/api?campaign_ids=123,456,abc&ad_group_id=99x')
    expect(parseGoogleDimensionFilters(url)).toEqual({
      campaignIds: ['123', '456'],
      adGroupId: '99',
      adId: null,
    })
  })

  test('ad_id composto grupo~anuncio', () => {
    const url = new URL('https://x/api?ad_id=11~759615610041')
    expect(parseGoogleDimensionFilters(url)).toEqual({
      campaignIds: [],
      adGroupId: '11',
      adId: '759615610041',
    })
  })

  test('vazio quando sem params', () => {
    const url = new URL('https://x/api')
    expect(parseGoogleDimensionFilters(url)).toEqual({ campaignIds: [], adGroupId: null, adId: null })
  })
})

describe('gaqlFilterClause', () => {
  test('campaign IN para múltiplos ids', () => {
    expect(gaqlFilterClause({ campaignIds: ['1', '2'], adGroupId: null, adId: null })).toBe(
      ' AND campaign.id IN (1, 2)'
    )
  })

  test('ad_group.id quando presente', () => {
    expect(gaqlFilterClause({ campaignIds: [], adGroupId: '7', adId: null })).toBe(
      ' AND ad_group.id = 7'
    )
  })

  test('combina campaign + ad_group', () => {
    expect(gaqlFilterClause({ campaignIds: ['1'], adGroupId: '7', adId: null })).toBe(
      ' AND campaign.id IN (1) AND ad_group.id = 7'
    )
  })

  test('ad_group_ad.ad.id quando presente', () => {
    expect(gaqlFilterClause({ campaignIds: [], adGroupId: '11', adId: '99' })).toBe(
      ' AND ad_group.id = 11 AND ad_group_ad.ad.id = 99'
    )
  })

  test('string vazia sem filtros', () => {
    expect(gaqlFilterClause({ campaignIds: [], adGroupId: null, adId: null })).toBe('')
  })
})
