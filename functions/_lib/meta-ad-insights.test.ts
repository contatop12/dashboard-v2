import { describe, expect, it } from 'vitest'
import { sortMetaAdInsightRows, type MetaAdInsightRow } from './meta-ad-insights'

const row = (id: string, spend: number, adset = 's1'): MetaAdInsightRow => ({
  ad_id: id,
  ad_name: id,
  adset_id: adset,
  spend,
  leads: 0,
  impressions: spend * 10,
  linkClicks: 0,
})

describe('sortMetaAdInsightRows', () => {
  it('returns all rows when limit is omitted (tree must not cap at 15)', () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(`a${i}`, 20 - i))
    expect(sortMetaAdInsightRows(rows)).toHaveLength(20)
  })

  it('caps carousel rows at limit', () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(`a${i}`, 20 - i))
    const top = sortMetaAdInsightRows(rows, 15)
    expect(top).toHaveLength(15)
    expect(top[0].ad_id).toBe('a0')
    expect(top[14].ad_id).toBe('a14')
  })
})
