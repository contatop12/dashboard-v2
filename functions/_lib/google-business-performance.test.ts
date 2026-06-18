import { describe, expect, it } from 'vitest'
import { parsePerformanceResponse, fetchPerformanceDaily } from './google-business-performance'

function metricSeries(metric: string, values: Array<[string, number]>) {
  return {
    dailyMetricTimeSeries: [
      {
        dailyMetric: metric,
        timeSeries: {
          datedValues: values.map(([d, v]) => {
            const [year, month, day] = d.split('-').map(Number)
            return { date: { year, month, day }, value: String(v) }
          }),
        },
      },
    ],
  }
}

const sampleBody = {
  multiDailyMetricTimeSeries: [
    metricSeries('BUSINESS_IMPRESSIONS_DESKTOP_MAPS', [['2026-06-01', 10], ['2026-06-02', 5]]),
    metricSeries('BUSINESS_IMPRESSIONS_MOBILE_SEARCH', [['2026-06-01', 20], ['2026-06-02', 7]]),
    metricSeries('CALL_CLICKS', [['2026-06-01', 3]]),
    metricSeries('WEBSITE_CLICKS', [['2026-06-02', 4]]),
  ],
}

describe('parsePerformanceResponse', () => {
  it('agrega impressões em views e separa Maps/Busca, preenche gaps', () => {
    const p = parsePerformanceResponse(sampleBody, '2026-06-01', '2026-06-02')
    expect(p.error).toBeNull()
    expect(p.daily).toHaveLength(2)
    const d1 = p.daily.find((d) => d.date === '2026-06-01')!
    expect(d1.viewsMaps).toBe(10)
    expect(d1.viewsSearch).toBe(20)
    expect(d1.views).toBe(30)
    expect(d1.calls).toBe(3)
    const d2 = p.daily.find((d) => d.date === '2026-06-02')!
    expect(d2.website).toBe(4)
    expect(d2.calls).toBe(0) // gap preenchido
    expect(p.totals.views).toBe(42) // 10+20 + 5+7
    expect(p.totals.calls).toBe(3)
    expect(p.totals.website).toBe(4)
  })

  it('corpo vazio devolve totais zerados sem erro', () => {
    const p = parsePerformanceResponse({}, '2026-06-01', '2026-06-01')
    expect(p.error).toBeNull()
    expect(p.totals.views).toBe(0)
    expect(p.daily).toHaveLength(1)
  })
})

describe('fetchPerformanceDaily', () => {
  it('monta URL com dailyMetrics e dailyRange e parseia', async () => {
    let calledUrl = ''
    const httpGet = async (url: string) => {
      calledUrl = url
      return { ok: true, status: 200, json: sampleBody }
    }
    const p = await fetchPerformanceDaily(httpGet, '123', '2026-06-01', '2026-06-02')
    expect(calledUrl).toContain('locations/123:fetchMultiDailyMetricsTimeSeries')
    expect(calledUrl).toContain('dailyMetrics=CALL_CLICKS')
    expect(calledUrl).toContain('dailyRange.startDate.year=2026')
    expect(calledUrl).toContain('dailyRange.endDate.day=2')
    expect(p.totals.views).toBe(42)
  })

  it('HTTP não-ok vira error e totais zerados', async () => {
    const httpGet = async () => ({ ok: false, status: 403, json: { error: { message: 'denied' } } })
    const p = await fetchPerformanceDaily(httpGet, '123', '2026-06-01', '2026-06-02')
    expect(p.error).toContain('denied')
    expect(p.totals.views).toBe(0)
  })
})
