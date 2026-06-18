import type { HttpGet, PerfTotals } from './google-business-performance'
import { fetchPerformanceDaily } from './google-business-performance'
import { fetchSearchKeywords, type KeywordsPayload } from './google-business-keywords'
import { fetchReviews, type ReviewsPayload } from './google-business-reviews'
import { fetchLocations, type BusinessLocation } from './google-business-locations'

export const MAX_BYLOCATION = 25

export type GbpMetric = { label: string; value: string; deltaPct: number | null }

export type ByLocationItem = {
  id: string
  label: string
  views: number
  calls: number
  website: number
  directions: number
}

export type BusinessOverviewSections = {
  locations: BusinessLocation[]
  selectedLocationId: string | null
  metrics: GbpMetric[]
  compareMetrics: GbpMetric[] | null
  daily: Awaited<ReturnType<typeof fetchPerformanceDaily>>['daily']
  searchKeywords: KeywordsPayload
  reviews: ReviewsPayload
  byLocation: { items: ByLocationItem[]; error: string | null }
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(n))
}

function deltaPct(primary: number, compare: number): number | null {
  if (compare === 0) return primary === 0 ? 0 : null
  return ((primary - compare) / compare) * 100
}

function buildMetrics(t: PerfTotals, c: PerfTotals | null): GbpMetric[] {
  const d = (p: number, cv: number) => (c ? deltaPct(p, cv) : null)
  return [
    { label: 'Visualizações', value: fmtInt(t.views), deltaPct: c ? d(t.views, c.views) : null },
    { label: 'Ligações', value: fmtInt(t.calls), deltaPct: c ? d(t.calls, c.calls) : null },
    { label: 'Cliques no site', value: fmtInt(t.website), deltaPct: c ? d(t.website, c.website) : null },
    { label: 'Rotas', value: fmtInt(t.directions), deltaPct: c ? d(t.directions, c.directions) : null },
    { label: 'Conversas', value: fmtInt(t.conversations), deltaPct: c ? d(t.conversations, c.conversations) : null },
  ]
}

export async function buildBusinessOverviewSections(
  httpGet: HttpGet,
  accountId: string,
  opts: {
    locationId?: string | null
    since: string
    until: string
    compareSince?: string | null
    compareUntil?: string | null
  }
): Promise<BusinessOverviewSections> {
  const locRes = await fetchLocations(httpGet, accountId)
  const locations = locRes.items
  const selected =
    (opts.locationId && locations.find((l) => l.id === opts.locationId)) || locations[0] || null
  const selectedLocationId = selected?.id ?? null

  if (!selectedLocationId) {
    return {
      locations,
      selectedLocationId: null,
      metrics: [],
      compareMetrics: null,
      daily: [],
      searchKeywords: { items: [], monthsCovered: null, error: locRes.error },
      reviews: { items: [], averageRating: null, totalCount: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }, error: locRes.error },
      byLocation: { items: [], error: locRes.error },
    }
  }

  const [perf, keywords, reviews] = await Promise.all([
    fetchPerformanceDaily(httpGet, selectedLocationId, opts.since, opts.until),
    fetchSearchKeywords(httpGet, selectedLocationId, opts.since, opts.until),
    fetchReviews(httpGet, accountId, selectedLocationId),
  ])

  let compareTotals: PerfTotals | null = null
  if (opts.compareSince && opts.compareUntil) {
    const cmp = await fetchPerformanceDaily(httpGet, selectedLocationId, opts.compareSince, opts.compareUntil)
    compareTotals = cmp.error ? null : cmp.totals
  }

  // byLocation: KPIs de cada local (capado)
  const byLocItems: ByLocationItem[] = []
  let byLocError: string | null = null
  if (locations.length > 1) {
    const capped = locations.slice(0, MAX_BYLOCATION)
    const results = await Promise.all(
      capped.map((l) => fetchPerformanceDaily(httpGet, l.id, opts.since, opts.until))
    )
    results.forEach((r, i) => {
      if (r.error) {
        byLocError = byLocError || r.error
        return
      }
      byLocItems.push({
        id: capped[i].id,
        label: capped[i].label,
        views: r.totals.views,
        calls: r.totals.calls,
        website: r.totals.website,
        directions: r.totals.directions,
      })
    })
    byLocItems.sort((a, b) => b.views - a.views)
  }

  return {
    locations,
    selectedLocationId,
    metrics: buildMetrics(perf.totals, compareTotals),
    compareMetrics: compareTotals ? buildMetrics(compareTotals, null) : null,
    daily: perf.daily,
    searchKeywords: keywords,
    reviews,
    byLocation: { items: byLocItems, error: byLocError },
  }
}
