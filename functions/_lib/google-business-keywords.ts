/** Termos de busca (searchkeywords impressions monthly) do Business Profile Performance API. */
import type { HttpGet } from './google-business-performance'

export type KeywordItem = { keyword: string; impressions: number; approximate: boolean }
export type KeywordsPayload = { items: KeywordItem[]; monthsCovered: string | null; error: string | null }

export function parseSearchKeywords(body: unknown): KeywordItem[] {
  const root = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const counts = Array.isArray(root.searchKeywordsCounts) ? root.searchKeywordsCounts : []
  const items: KeywordItem[] = []
  for (const c of counts) {
    const o = c as Record<string, unknown>
    const keyword = typeof o.searchKeyword === 'string' && o.searchKeyword.trim() ? o.searchKeyword.trim() : '—'
    const iv = (o.insightsValue ?? {}) as Record<string, unknown>
    const hasValue = iv.value != null
    const raw = hasValue ? iv.value : iv.threshold
    const impressions = Number.parseInt(String(raw ?? '0'), 10) || 0
    items.push({ keyword, impressions, approximate: !hasValue })
  }
  items.sort((a, b) => b.impressions - a.impressions)
  return items
}

export async function fetchSearchKeywords(
  httpGet: HttpGet,
  locationId: string,
  since: string,
  until: string
): Promise<KeywordsPayload> {
  const [sy, sm] = since.split('-').map((x) => Number.parseInt(x, 10))
  const [ey, em] = until.split('-').map((x) => Number.parseInt(x, 10))
  const u = new URL(
    `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}/searchkeywords/impressions/monthly`
  )
  u.searchParams.set('monthlyRange.startMonth.year', String(sy))
  u.searchParams.set('monthlyRange.startMonth.month', String(sm))
  u.searchParams.set('monthlyRange.endMonth.year', String(ey))
  u.searchParams.set('monthlyRange.endMonth.month', String(em))

  const monthsCovered = `${sy}-${String(sm).padStart(2, '0')} a ${ey}-${String(em).padStart(2, '0')}`
  const res = await httpGet(u.toString())
  if (!res.ok) {
    const j = res.json as { error?: { message?: string } }
    return { items: [], monthsCovered, error: j?.error?.message || `Search keywords API (${res.status})` }
  }
  return { items: parseSearchKeywords(res.json), monthsCovered, error: null }
}
