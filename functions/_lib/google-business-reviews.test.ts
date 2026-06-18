import { describe, expect, it } from 'vitest'
import { parseReviews, fetchReviews } from './google-business-reviews'

const body = {
  reviews: [
    { reviewId: 'r1', reviewer: { displayName: 'Maria' }, starRating: 'FIVE', comment: 'Ótimo', updateTime: '2026-06-10T00:00:00Z' },
    { reviewId: 'r2', reviewer: { displayName: 'João' }, starRating: 'FOUR', comment: 'Bom', updateTime: '2026-06-09T00:00:00Z' },
    { reviewId: 'r3', reviewer: {}, starRating: 'FIVE' },
  ],
  averageRating: 4.7,
  totalReviewCount: 148,
}

describe('parseReviews', () => {
  it('mapeia starRating enum->número, distribuição e fallback de autor', () => {
    const p = parseReviews(body)
    expect(p.items).toHaveLength(3)
    expect(p.items[0].rating).toBe(5)
    expect(p.items[2].author).toBe('Anônimo')
    expect(p.averageRating).toBe(4.7)
    expect(p.totalCount).toBe(148)
    expect(p.distribution['5']).toBe(2)
    expect(p.distribution['4']).toBe(1)
  })
})

describe('fetchReviews', () => {
  it('chama v4 com account+location e parseia', async () => {
    let url = ''
    const httpGet = async (u: string) => {
      url = u
      return { ok: true, status: 200, json: body }
    }
    const p = await fetchReviews(httpGet, 'acc1', 'loc1')
    expect(url).toContain('mybusiness.googleapis.com/v4/accounts/acc1/locations/loc1/reviews')
    expect(p.totalCount).toBe(148)
  })

  it('403 vira error sem quebrar', async () => {
    const httpGet = async () => ({ ok: false, status: 403, json: { error: { message: 'not allowlisted' } } })
    const p = await fetchReviews(httpGet, 'acc1', 'loc1')
    expect(p.error).toContain('not allowlisted')
    expect(p.items).toEqual([])
  })
})
