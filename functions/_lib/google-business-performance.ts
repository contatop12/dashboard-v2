/** Métricas diárias do Business Profile Performance API (views, ligações, site, rotas, conversas). */

export type HttpGet = (url: string) => Promise<{ ok: boolean; status: number; json: unknown }>

export type PerfTotals = {
  views: number
  viewsMaps: number
  viewsSearch: number
  calls: number
  website: number
  directions: number
  conversations: number
}

export type PerfDaily = { date: string } & PerfTotals

export type PerformancePayload = {
  daily: PerfDaily[]
  totals: PerfTotals
  error: string | null
}

const PERF_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'BUSINESS_CONVERSATIONS',
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function dateToYmd(d: unknown): string | null {
  if (!d || typeof d !== 'object') return null
  const o = d as { year?: number; month?: number; day?: number }
  if (!o.year || !o.month || !o.day) return null
  return `${o.year}-${pad2(o.month)}-${pad2(o.day)}`
}

function ymdParts(s: string): { year: number; month: number; day: number } {
  const [year, month, day] = s.split('-').map((x) => Number.parseInt(x, 10))
  return { year, month, day }
}

function emptyTotals(): PerfTotals {
  return { views: 0, viewsMaps: 0, viewsSearch: 0, calls: 0, website: 0, directions: 0, conversations: 0 }
}

function ymdAddOne(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function parsePerformanceResponse(body: unknown, since: string, until: string): PerformancePayload {
  const root = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const multi = Array.isArray(root.multiDailyMetricTimeSeries) ? root.multiDailyMetricTimeSeries : []

  // metric -> (date -> value)
  const byMetric = new Map<string, Map<string, number>>()
  for (const block of multi) {
    const dmts = (block as Record<string, unknown>)?.dailyMetricTimeSeries
    if (!Array.isArray(dmts)) continue
    for (const dm of dmts) {
      const o = dm as Record<string, unknown>
      const metric = typeof o.dailyMetric === 'string' ? o.dailyMetric : ''
      if (!metric) continue
      const ts = (o.timeSeries as Record<string, unknown>)?.datedValues
      const map = byMetric.get(metric) ?? new Map<string, number>()
      if (Array.isArray(ts)) {
        for (const dv of ts) {
          const dvo = dv as Record<string, unknown>
          const ymd = dateToYmd(dvo.date)
          if (!ymd) continue
          const value = Number.parseInt(String(dvo.value ?? '0'), 10) || 0
          map.set(ymd, (map.get(ymd) ?? 0) + value)
        }
      }
      byMetric.set(metric, map)
    }
  }

  const get = (metric: string, ymd: string) => byMetric.get(metric)?.get(ymd) ?? 0

  const daily: PerfDaily[] = []
  const totals = emptyTotals()
  let guard = 0
  for (let d = since; d <= until && guard < 800; d = ymdAddOne(d), guard++) {
    const viewsMaps = get('BUSINESS_IMPRESSIONS_DESKTOP_MAPS', d) + get('BUSINESS_IMPRESSIONS_MOBILE_MAPS', d)
    const viewsSearch = get('BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', d) + get('BUSINESS_IMPRESSIONS_MOBILE_SEARCH', d)
    const calls = get('CALL_CLICKS', d)
    const website = get('WEBSITE_CLICKS', d)
    const directions = get('BUSINESS_DIRECTION_REQUESTS', d)
    const conversations = get('BUSINESS_CONVERSATIONS', d)
    const views = viewsMaps + viewsSearch
    daily.push({ date: d, views, viewsMaps, viewsSearch, calls, website, directions, conversations })
    totals.views += views
    totals.viewsMaps += viewsMaps
    totals.viewsSearch += viewsSearch
    totals.calls += calls
    totals.website += website
    totals.directions += directions
    totals.conversations += conversations
  }

  return { daily, totals, error: null }
}

export async function fetchPerformanceDaily(
  httpGet: HttpGet,
  locationId: string,
  since: string,
  until: string
): Promise<PerformancePayload> {
  const u = new URL(
    `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}:fetchMultiDailyMetricsTimeSeries`
  )
  for (const m of PERF_METRICS) u.searchParams.append('dailyMetrics', m)
  const s = ymdParts(since)
  const e = ymdParts(until)
  u.searchParams.set('dailyRange.startDate.year', String(s.year))
  u.searchParams.set('dailyRange.startDate.month', String(s.month))
  u.searchParams.set('dailyRange.startDate.day', String(s.day))
  u.searchParams.set('dailyRange.endDate.year', String(e.year))
  u.searchParams.set('dailyRange.endDate.month', String(e.month))
  u.searchParams.set('dailyRange.endDate.day', String(e.day))

  const res = await httpGet(u.toString())
  if (!res.ok) {
    const j = res.json as { error?: { message?: string } }
    return { daily: [], totals: emptyTotals(), error: j?.error?.message || `Performance API (${res.status})` }
  }
  return parsePerformanceResponse(res.json, since, until)
}
