import { format } from 'date-fns'

export function formatYmd(date) {
  if (!date) return ''
  try {
    return format(date, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

/**
 * Monta a query string para meta-overview / google-ads-overview.
 * @param {string} endpoint ex. /api/admin/platform/meta-overview
 * @param {{ orgId?: string | null, workerQuery?: string, dateRange: { start: Date, end: Date }, compareDateRange: { start: Date, end: Date }, compareEnabled: boolean }} opts
 */
export function buildPlatformOverviewUrl(endpoint, opts) {
  const p = new URLSearchParams()
  const orgId = (opts.orgId != null && String(opts.orgId).trim()) || ''
  if (orgId) {
    p.set('org_id', orgId)
  } else {
    const wq = typeof opts.workerQuery === 'string' ? opts.workerQuery.trim() : ''
    if (wq) {
      for (const seg of wq.split('&')) {
        if (!seg) continue
        const eq = seg.indexOf('=')
        if (eq === -1) continue
        const k = decodeURIComponent(seg.slice(0, eq).trim())
        const v = decodeURIComponent(seg.slice(eq + 1).trim())
        if (k) p.set(k, v)
      }
    }
  }
  const since = formatYmd(opts.dateRange?.start)
  const until = formatYmd(opts.dateRange?.end)
  if (since) p.set('since', since)
  if (until) p.set('until', until)
  if (opts.compareEnabled && opts.compareDateRange?.start && opts.compareDateRange?.end) {
    const cs = formatYmd(opts.compareDateRange.start)
    const ct = formatYmd(opts.compareDateRange.end)
    if (cs && ct) {
      p.set('compare_since', cs)
      p.set('compare_until', ct)
    }
  }
  const qs = p.toString()
  return qs ? `${endpoint}?${qs}` : endpoint
}
