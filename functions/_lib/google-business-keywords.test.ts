import { describe, expect, it } from 'vitest'
import { parseSearchKeywords, fetchSearchKeywords } from './google-business-keywords'

const body = {
  searchKeywordsCounts: [
    { searchKeyword: 'consultoria financeira', insightsValue: { value: '1240' } },
    { searchKeyword: 'p12', insightsValue: { threshold: '15' } },
    { searchKeyword: 'planejamento', insightsValue: { value: '300' } },
  ],
}

describe('parseSearchKeywords', () => {
  it('ordena por impressões desc e marca threshold como aproximado', () => {
    const items = parseSearchKeywords(body)
    expect(items.map((i) => i.keyword)).toEqual(['consultoria financeira', 'planejamento', 'p12'])
    expect(items[0].approximate).toBe(false)
    const p12 = items.find((i) => i.keyword === 'p12')!
    expect(p12.impressions).toBe(15)
    expect(p12.approximate).toBe(true)
  })
})

describe('fetchSearchKeywords', () => {
  it('monta monthlyRange e parseia', async () => {
    let url = ''
    const httpGet = async (u: string) => {
      url = u
      return { ok: true, status: 200, json: body }
    }
    const p = await fetchSearchKeywords(httpGet, '123', '2026-05-10', '2026-06-20')
    expect(url).toContain('locations/123/searchkeywords/impressions/monthly')
    expect(url).toContain('monthlyRange.startMonth.year=2026')
    expect(url).toContain('monthlyRange.startMonth.month=5')
    expect(url).toContain('monthlyRange.endMonth.month=6')
    expect(p.items).toHaveLength(3)
    expect(p.monthsCovered).toBe('2026-05 a 2026-06')
  })

  it('erro HTTP vira payload com error', async () => {
    const httpGet = async () => ({ ok: false, status: 400, json: { error: { message: 'bad' } } })
    const p = await fetchSearchKeywords(httpGet, '123', '2026-05-10', '2026-06-20')
    expect(p.error).toContain('bad')
    expect(p.items).toEqual([])
  })
})
