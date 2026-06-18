/** Reviews do Google Business via My Business API v4 (legada, requer allowlist). */
import type { HttpGet } from './google-business-performance'

export type ReviewItem = { id: string; author: string; rating: number; comment: string; date: string | null }
export type ReviewsPayload = {
  items: ReviewItem[]
  averageRating: number | null
  totalCount: number | null
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>
  error: string | null
}

const STAR: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

function emptyDistribution(): Record<'1' | '2' | '3' | '4' | '5', number> {
  return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
}

export function parseReviews(body: unknown): ReviewsPayload {
  const root = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const reviews = Array.isArray(root.reviews) ? root.reviews : []
  const distribution = emptyDistribution()
  const items: ReviewItem[] = []
  for (const r of reviews) {
    const o = r as Record<string, unknown>
    const reviewer = (o.reviewer ?? {}) as Record<string, unknown>
    const rating = STAR[String(o.starRating ?? '')] ?? 0
    const item: ReviewItem = {
      id: String(o.reviewId ?? o.name ?? `${items.length}`),
      author: typeof reviewer.displayName === 'string' && reviewer.displayName.trim() ? reviewer.displayName.trim() : 'Anônimo',
      rating,
      comment: typeof o.comment === 'string' ? o.comment : '',
      date: typeof o.updateTime === 'string' ? o.updateTime : typeof o.createTime === 'string' ? o.createTime : null,
    }
    items.push(item)
    if (rating >= 1 && rating <= 5) {
      distribution[String(rating) as '1' | '2' | '3' | '4' | '5']++
    }
  }
  const avg = typeof root.averageRating === 'number' ? root.averageRating : null
  const total = typeof root.totalReviewCount === 'number' ? root.totalReviewCount : null
  return { items, averageRating: avg, totalCount: total, distribution, error: null }
}

export async function fetchReviews(httpGet: HttpGet, accountId: string, locationId: string): Promise<ReviewsPayload> {
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50&orderBy=updateTime%20desc`
  const res = await httpGet(url)
  if (!res.ok) {
    const j = res.json as { error?: { message?: string } }
    return {
      items: [],
      averageRating: null,
      totalCount: null,
      distribution: emptyDistribution(),
      error: j?.error?.message || `Reviews API (${res.status})`,
    }
  }
  return parseReviews(res.json)
}
