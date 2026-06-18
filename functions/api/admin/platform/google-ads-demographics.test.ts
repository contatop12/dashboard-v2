import { describe, expect, it } from 'vitest'
import { fetchGoogleDemographicsPayload } from './google-ads-demographics'

type Row = Record<string, unknown>

/**
 * Captura as queries GAQL geradas e devolve linhas por resource (FROM x_view).
 * Permite testar tanto o texto da query quanto a agregação.
 */
function makeFetchRows(rowsByResource: Record<string, Row[]> = {}) {
  const queries: string[] = []
  const fn = async (_ver: string, _id: string, _headers: Record<string, string>, query: string) => {
    queries.push(query)
    const m = /FROM\s+(\w+)/.exec(query)
    const resource = m ? m[1] : ''
    return { rows: rowsByResource[resource] ?? [] }
  }
  return { fn, queries }
}

describe('fetchGoogleDemographicsPayload', () => {
  it('não filtra por ad_group_criterion.status (descartava métricas de segmentos auto-reportados)', async () => {
    const { fn, queries } = makeFetchRows()
    await fetchGoogleDemographicsPayload('v23', '123', {}, '2026-01-01', '2026-01-31', fn)
    expect(queries).toHaveLength(4)
    for (const q of queries) {
      expect(q).not.toContain('ad_group_criterion.status')
      expect(q).toContain("campaign.status != 'REMOVED'")
      expect(q).toContain("segments.date BETWEEN '2026-01-01' AND '2026-01-31'")
    }
  })

  it('agrega métricas de segmento mesmo sem status de critério presente', async () => {
    const genderRows: Row[] = [
      { adGroupCriterion: { gender: { type: 'MALE' } }, metrics: { impressions: '100', clicks: '10', costMicros: '5000000', conversions: 2 } },
      { adGroupCriterion: { gender: { type: 'FEMALE' } }, metrics: { impressions: '50', clicks: '5', costMicros: '2000000', conversions: 1 } },
    ]
    const { fn } = makeFetchRows({ gender_view: genderRows })
    const payload = await fetchGoogleDemographicsPayload('v23', '123', {}, '2026-01-01', '2026-01-31', fn)
    expect(payload.gender.error).toBeNull()
    expect(payload.gender.items).toHaveLength(2)
    const male = payload.gender.items.find((i) => i.segmentKey === 'MALE')
    expect(male?.impressions).toBe(100)
    expect(male?.interactions).toBe(10)
    expect(male?.conversions).toBe(2)
    expect(male?.cost).toBeCloseTo(5)
  })

  it('repassa o filterClause adicional na query', async () => {
    const { fn, queries } = makeFetchRows()
    await fetchGoogleDemographicsPayload('v23', '123', {}, '2026-01-01', '2026-01-31', fn, " AND campaign.id = 555")
    for (const q of queries) {
      expect(q).toContain('AND campaign.id = 555')
    }
  })
})
