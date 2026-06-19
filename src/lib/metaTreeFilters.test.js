import { describe, expect, it } from 'vitest'
import { filterMetaAdsetRows } from './metaTreeFilters'

describe('filterMetaAdsetRows', () => {
  const rows = [
    { id: '1', campaignId: 'c1', effectiveStatus: 'ACTIVE', name: 'A' },
    { id: '2', campaignId: 'c2', effectiveStatus: 'PAUSED', name: 'B' },
  ]

  it('filtra por status ACTIVE', () => {
    const out = filterMetaAdsetRows(rows, { status: { id: 'ACTIVE', name: 'Ativas' } })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('1')
  })

  it('filtra por objetivo via campaignIds', () => {
    const out = filterMetaAdsetRows(rows, {
      objetivo: { id: 'OUTCOME_TRAFFIC', name: 'Tráfego', campaignIds: ['c2'] },
    })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('2')
  })
})
