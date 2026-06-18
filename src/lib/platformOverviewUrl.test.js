import { describe, expect, test } from 'vitest'
import { buildPlatformOverviewUrl } from './platformOverviewUrl'

const range = { start: new Date(2026, 4, 1), end: new Date(2026, 4, 30) }
const base = { orgId: 'org1', dateRange: range, compareDateRange: range, compareEnabled: false }

describe('buildPlatformOverviewUrl filters', () => {
  test('sem filters não adiciona params de dimensão', () => {
    const url = buildPlatformOverviewUrl('/api/x', base)
    expect(url).not.toContain('campaign_ids')
    expect(url).not.toContain('ad_group_id')
  })

  test('inclui campaign_ids como CSV', () => {
    const url = buildPlatformOverviewUrl('/api/x', { ...base, filters: { campaignIds: ['123', '456'] } })
    expect(url).toContain('campaign_ids=123%2C456')
  })

  test('inclui adset_id, ad_group_id e ad_id quando presentes', () => {
    const url = buildPlatformOverviewUrl('/api/x', {
      ...base,
      filters: { adsetId: '11', adGroupId: '22', adId: '33' },
    })
    expect(url).toContain('adset_id=11')
    expect(url).toContain('ad_group_id=22')
    expect(url).toContain('ad_id=33')
  })

  test('ignora valores vazios', () => {
    const url = buildPlatformOverviewUrl('/api/x', { ...base, filters: { campaignIds: [], adId: '' } })
    expect(url).not.toContain('campaign_ids')
    expect(url).not.toContain('ad_id')
  })

  test('inclui location_id quando filters.locationId é passado', () => {
    const url = buildPlatformOverviewUrl('/api/x', {
      orgId: 'org1',
      dateRange: { start: new Date('2026-06-01'), end: new Date('2026-06-30') },
      filters: { locationId: '123' },
    })
    expect(url).toContain('location_id=123')
  })
})
