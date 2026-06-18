import { describe, expect, it } from 'vitest'
import { buildBusinessOverviewSections } from './google-business-overview-core'

function perfBody(calls: number, ymd = '2026-06-01') {
  const [year, month, day] = ymd.split('-').map(Number)
  return {
    multiDailyMetricTimeSeries: [
      {
        dailyMetricTimeSeries: [
          { dailyMetric: 'CALL_CLICKS', timeSeries: { datedValues: [{ date: { year, month, day }, value: String(calls) }] } },
          { dailyMetric: 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', timeSeries: { datedValues: [{ date: { year, month, day }, value: '100' }] } },
        ],
      },
    ],
  }
}

const locationsBody = {
  locations: [
    { name: 'locations/111', title: 'Centro' },
    { name: 'locations/222', title: 'Zona Sul' },
  ],
}

function router(url: string) {
  if (url.includes('/locations') && url.includes('readMask')) return { ok: true, status: 200, json: locationsBody }
  if (url.includes(':fetchMultiDailyMetricsTimeSeries')) return { ok: true, status: 200, json: perfBody(5) }
  if (url.includes('searchkeywords')) return { ok: true, status: 200, json: { searchKeywordsCounts: [{ searchKeyword: 'x', insightsValue: { value: '9' } }] } }
  if (url.includes('/reviews')) return { ok: true, status: 200, json: { reviews: [], averageRating: 4.5, totalReviewCount: 3 } }
  return { ok: false, status: 404, json: { error: { message: 'no route' } } }
}

describe('buildBusinessOverviewSections', () => {
  it('monta seções e seleciona primeiro local quando não há location_id', async () => {
    const httpGet = async (u: string) => router(u)
    const s = await buildBusinessOverviewSections(httpGet, 'acc1', { since: '2026-06-01', until: '2026-06-01' })
    expect(s.locations).toHaveLength(2)
    expect(s.selectedLocationId).toBe('111')
    expect(s.metrics.find((m) => m.label === 'Ligações')?.value).toBe('5')
    expect(s.metrics.find((m) => m.label === 'Visualizações')?.value).toBe('100')
    expect(s.searchKeywords.items).toHaveLength(1)
    expect(s.reviews.totalCount).toBe(3)
    expect(s.byLocation.items.length).toBe(2)
  })

  it('respeita location_id selecionado e calcula deltaPct com comparação', async () => {
    let perfCallCount = 0
    const httpGet = async (u: string) => {
      if (u.includes(':fetchMultiDailyMetricsTimeSeries')) {
        perfCallCount++
        const isCompare = u.includes('dailyRange.startDate.month=5')
        const ymd = isCompare ? '2026-05-01' : '2026-06-01'
        return { ok: true, status: 200, json: perfBody(isCompare ? 5 : 10, ymd) }
      }
      return router(u)
    }
    const s = await buildBusinessOverviewSections(httpGet, 'acc1', {
      locationId: '222',
      since: '2026-06-01',
      until: '2026-06-01',
      compareSince: '2026-05-01',
      compareUntil: '2026-05-01',
    })
    expect(s.selectedLocationId).toBe('222')
    const calls = s.metrics.find((m) => m.label === 'Ligações')!
    expect(calls.value).toBe('10')
    expect(calls.deltaPct).toBe(100) // (10-5)/5
    expect(perfCallCount).toBeGreaterThanOrEqual(2)
  })
})
