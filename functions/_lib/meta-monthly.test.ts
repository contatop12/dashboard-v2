import { describe, expect, it } from 'vitest'
import { rowsToMetaMonthlyItems } from './meta-monthly'

describe('rowsToMetaMonthlyItems', () => {
  it('agrupa por mês e conta leads corretamente', () => {
    const items = rowsToMetaMonthlyItems([
      {
        date_start: '2026-06-01',
        spend: '100',
        impressions: '1000',
        clicks: '10',
        actions: [{ action_type: 'lead', value: '5' }],
      },
      {
        date_start: '2026-05-01',
        spend: '50',
        impressions: '500',
        clicks: '5',
        actions: [{ action_type: 'lead', value: '3' }],
      },
    ])
    expect(items).toHaveLength(2)
    expect(items[0].monthKey).toBe('2026-06')
    expect(items[0].conversions).toBe(5)
    expect(items[1].conversions).toBe(3)
  })
})
