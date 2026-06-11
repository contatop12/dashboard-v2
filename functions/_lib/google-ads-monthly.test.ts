import { describe, expect, it } from 'vitest'
import {
  aggregateGoogleMonthlyRows,
  fillMonthlyGaps,
  lastNCalendarMonthsWindow,
} from './google-ads-monthly'

describe('lastNCalendarMonthsWindow', () => {
  it('retorna 6 meses civis até a data final', () => {
    expect(lastNCalendarMonthsWindow('2026-06-11', 6)).toEqual({
      since: '2026-01-01',
      until: '2026-06-11',
    })
  })
})

describe('aggregateGoogleMonthlyRows', () => {
  it('agrega por segments.month', () => {
    const items = aggregateGoogleMonthlyRows([
      {
        segments: { month: '2026-05-01' },
        metrics: { costMicros: '2000000', impressions: '100', clicks: '10', conversions: 1 },
      },
      {
        segments: { month: '2026-06-01' },
        metrics: { costMicros: '3000000', impressions: '200', clicks: '20', conversions: 2 },
      },
    ])
    expect(items).toHaveLength(2)
    expect(items[0].monthKey).toBe('2026-06')
    expect(items[0].spend).toBeCloseTo(3)
    expect(items[1].monthKey).toBe('2026-05')
  })
})

describe('fillMonthlyGaps', () => {
  it('preenche meses faltantes com zero', () => {
    const filled = fillMonthlyGaps(
      '2026-06-11',
      [{ monthKey: '2026-06', impressions: 1, clicks: 1, spend: 1, conversions: 0, conversionsValue: 0 }],
      6
    )
    expect(filled).toHaveLength(6)
    expect(filled.some((m) => m.monthKey === '2026-01' && m.spend === 0)).toBe(true)
  })
})
