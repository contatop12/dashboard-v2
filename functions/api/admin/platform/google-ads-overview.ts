import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json, jsonError } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'
import {
  customerPathId,
  resolveGoogleApiVersion,
  resolveGoogleLoginCustomerId,
} from '../../../_lib/google-ads-env'
import {
  buildConversionResourceName,
  extractConversionActionId,
  parseConversionActionFields,
  readConversionActionResourceName,
} from '../../../_lib/google-ads-conversions'
import {
  getActiveConnectionForOrg,
  getValidGoogleAccessTokenFromCredential,
} from '../../../_lib/org-platform-credentials'
import {
  parseGoogleDimensionFilters,
  gaqlFilterClause,
  type GoogleDimensionFilters,
} from '../../../_lib/google-ads-filters'
import {
  attachKeywordsToGoogleTree,
  buildGoogleTree,
  parseCampaignNodes,
  parseAdGroupNodes,
  parseAdNodes,
} from '../../../_lib/google-ads-tree'
import {
  aggregateSearchTerms,
  aggregateTopKeywords,
  type SearchTermItem,
  type TopKeywordItem,
} from '../../../_lib/google-ads-keywords'
import { EMPTY_GOOGLE_DEMOGRAPHICS, fetchGoogleDemographicsPayload } from './google-ads-demographics'
import {
  aggregateGoogleMonthlyRows,
  fillMonthlyGaps,
  lastNCalendarMonthsWindow,
  type MonthlyResultItem,
} from '../../../_lib/google-ads-monthly'

type Metric = { label: string; value: string; deltaPct?: number | null }

type RawAgg = {
  spend: number
  impressions: number
  clicks: number
  conversions: number
}

const MAX_RANGE_DAYS = 366

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n)
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function daysBetweenInclusive(since: string, until: string): number {
  const a = new Date(since + 'T12:00:00Z').getTime()
  const b = new Date(until + 'T12:00:00Z').getTime()
  return Math.floor((b - a) / (86400 * 1000)) + 1
}

function defaultLast30Ymd(): { since: string; until: string } {
  const u = new Date()
  const until = u.toISOString().slice(0, 10)
  const s = new Date(u)
  s.setUTCDate(s.getUTCDate() - 29)
  const since = s.toISOString().slice(0, 10)
  return { since, until }
}

function parseRangeParams(url: URL): { since: string; until: string; compareSince: string | null; compareUntil: string | null } {
  const ds = url.searchParams.get('since')?.trim() ?? ''
  const du = url.searchParams.get('until')?.trim() ?? ''
  let since = isYmd(ds) ? ds : ''
  let until = isYmd(du) ? du : ''
  if (!since || !until) {
    const d = defaultLast30Ymd()
    since = d.since
    until = d.until
  }
  if (daysBetweenInclusive(since, until) > MAX_RANGE_DAYS) {
    const u = new Date(since + 'T12:00:00Z')
    u.setUTCDate(u.getUTCDate() + MAX_RANGE_DAYS - 1)
    until = u.toISOString().slice(0, 10)
  }
  const cs = url.searchParams.get('compare_since')?.trim() ?? ''
  const ct = url.searchParams.get('compare_until')?.trim() ?? ''
  const compareSince = isYmd(cs) ? cs : null
  const compareUntil = isYmd(ct) ? ct : null
  if (compareSince && compareUntil && daysBetweenInclusive(compareSince, compareUntil) > MAX_RANGE_DAYS) {
    return { since, until, compareSince: null, compareUntil: null }
  }
  return { since, until, compareSince, compareUntil }
}

function deltaPct(primary: number, compare: number): number | null {
  if (compare === 0) return primary === 0 ? 0 : null
  return ((primary - compare) / compare) * 100
}

function emptyRaw(): RawAgg {
  return { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
}

function aggregateFromCampaignRows(
  rows: {
    metrics?: {
      costMicros?: string
      impressions?: string
      clicks?: string
      conversions?: string | number
    }
  }[]
): RawAgg {
  let costMicros = 0
  let impressions = 0
  let clicks = 0
  let conversions = 0
  for (const row of rows) {
    const m = row.metrics
    if (!m) continue
    costMicros += Number.parseInt(String(m.costMicros ?? '0'), 10) || 0
    impressions += Number.parseInt(String(m.impressions ?? '0'), 10) || 0
    clicks += Number.parseInt(String(m.clicks ?? '0'), 10) || 0
    conversions += Number.parseFloat(String(m.conversions ?? '0')) || 0
  }
  return {
    spend: costMicros / 1_000_000,
    impressions,
    clicks,
    conversions,
  }
}

function buildGoogleMetrics(primary: RawAgg, compare: RawAgg | null): Metric[] {
  const d = (p: number, c: number) => (compare ? deltaPct(p, c) : null)
  const p = primary
  const c = compare
  const ctrP = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0
  const ctrC = c && c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0
  const cpcP = p.clicks > 0 ? p.spend / p.clicks : 0
  const cpcC = c && c.clicks > 0 ? c.spend / c.clicks : 0
  const custoConvP = p.conversions > 0 ? p.spend / p.conversions : 0
  const custoConvC = c && c.conversions > 0 ? c.spend / c.conversions : 0
  const taxaP = p.clicks > 0 ? (p.conversions / p.clicks) * 100 : 0
  const taxaC = c && c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0

  return [
    { label: 'Investimento', value: fmtBRL(p.spend), deltaPct: c ? d(p.spend, c.spend) : null },
    { label: 'Impressões', value: fmtInt(p.impressions), deltaPct: c ? d(p.impressions, c.impressions) : null },
    { label: 'Cliques', value: fmtInt(p.clicks), deltaPct: c ? d(p.clicks, c.clicks) : null },
    { label: 'CTR', value: `${ctrP.toFixed(2)}%`, deltaPct: c ? d(ctrP, ctrC) : null },
    { label: 'CPC Médio', value: fmtBRL(cpcP), deltaPct: c ? d(cpcP, cpcC) : null },
    { label: 'Conversões', value: fmtInt(Math.round(p.conversions)), deltaPct: c ? d(p.conversions, c.conversions) : null },
    {
      label: 'Custo/Conv.',
      value: p.conversions > 0 ? fmtBRL(custoConvP) : '—',
      deltaPct: c && p.conversions > 0 && c.conversions > 0 ? d(custoConvP, custoConvC) : null,
    },
    { label: 'Taxa de Conv.', value: `${taxaP.toFixed(2)}%`, deltaPct: c ? d(taxaP, taxaC) : null },
  ]
}

function buildCompareStrip(c: RawAgg): Metric[] {
  const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0
  const cpc = c.clicks > 0 ? c.spend / c.clicks : 0
  const custoConv = c.conversions > 0 ? c.spend / c.conversions : 0
  const taxa = c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0
  return [
    { label: 'Investimento', value: fmtBRL(c.spend) },
    { label: 'Impressões', value: fmtInt(c.impressions) },
    { label: 'Cliques', value: fmtInt(c.clicks) },
    { label: 'CTR', value: `${ctr.toFixed(2)}%` },
    { label: 'CPC Médio', value: fmtBRL(cpc) },
    { label: 'Conversões', value: fmtInt(Math.round(c.conversions)) },
    { label: 'Custo/Conv.', value: c.conversions > 0 ? fmtBRL(custoConv) : '—' },
    { label: 'Taxa de Conv.', value: `${taxa.toFixed(2)}%` },
  ]
}

async function fetchCustomerDescriptiveName(
  ver: string,
  numericId: string,
  headers: Record<string, string>
): Promise<string | null> {
  const url = `https://googleads.googleapis.com/${ver}/customers/${numericId}/googleAds:search`
  const query = `SELECT customer.descriptive_name, customer.id FROM customer LIMIT 1`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  })
  const body = (await res.json()) as {
    results?: { customer?: { descriptiveName?: string } }[]
    error?: { message?: string }
  }
  if (!res.ok || body.error) return null
  const name = body.results?.[0]?.customer?.descriptiveName?.trim()
  return name || null
}

type GaqlRow = Record<string, unknown>

async function fetchAllGaqlRows(
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  query: string
): Promise<{ rows: GaqlRow[]; error?: string }> {
  const url = `https://googleads.googleapis.com/${ver}/customers/${numericId}/googleAds:search`
  const rows: GaqlRow[] = []
  let pageToken: string | undefined
  for (;;) {
    const body: { query: string; pageToken?: string } = { query }
    if (pageToken) body.pageToken = pageToken
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const j = (await res.json()) as {
      results?: GaqlRow[]
      nextPageToken?: string
      error?: {
        message?: string
        status?: string
        details?: Array<{ errors?: Array<{ message?: string }> }>
      }
    }
    if (!res.ok || j.error) {
      // A mensagem top-level é genérica ("Request contains an invalid argument.");
      // a causa real vem em details[].errors[].message (GoogleAdsFailure).
      const detailMessages = (j.error?.details ?? [])
        .flatMap((d) => d.errors ?? [])
        .map((e) => e.message?.trim())
        .filter((m): m is string => !!m)
      const error =
        detailMessages.length > 0
          ? detailMessages.join(' · ')
          : j.error?.message || `Google Ads API (${res.status})`
      return { rows: [], error }
    }
    rows.push(...(j.results ?? []))
    pageToken = j.nextPageToken
    if (!pageToken) break
  }
  return { rows }
}

type DailyBucketAgg = {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  conversionsValue: number
}

function emptyDailyBucket(): DailyBucketAgg {
  return { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionsValue: 0 }
}

function aggregateDaily(
  rows: {
    segments?: { date?: string }
    metrics?: {
      costMicros?: string
      impressions?: string
      clicks?: string
      conversions?: string | number
      conversionsValue?: string | number
    }
  }[]
): Array<{
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  conversionsValue: number
}> {
  const byDate = new Map<string, DailyBucketAgg>()
  for (const row of rows) {
    const d = row.segments?.date
    if (!d) continue
    const m = row.metrics
    if (!m) continue
    const cur = byDate.get(d) ?? emptyDailyBucket()
    cur.spend += (Number.parseInt(String(m.costMicros ?? '0'), 10) || 0) / 1_000_000
    cur.impressions += Number.parseInt(String(m.impressions ?? '0'), 10) || 0
    cur.clicks += Number.parseInt(String(m.clicks ?? '0'), 10) || 0
    cur.conversions += Number.parseFloat(String(m.conversions ?? '0')) || 0
    cur.conversionsValue += Number.parseFloat(String(m.conversionsValue ?? m.conversions_value ?? 0)) || 0
    byDate.set(d, cur)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      spend: v.spend,
      impressions: v.impressions,
      clicks: v.clicks,
      conversions: v.conversions,
      conversionsValue: v.conversionsValue,
    }))
}

type GoogleDailyRow = {
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  conversionsValue: number
}

type ConversionBreakdownRow = {
  id: string
  name: string
  conversions: number
  value: number
}

type ConversionBreakdownPayload = {
  primary: ConversionBreakdownRow[]
  secondary: ConversionBreakdownRow[]
  error: string | null
}

const EMPTY_CONVERSION_BREAKDOWN: ConversionBreakdownPayload = {
  primary: [],
  secondary: [],
  error: null,
}

type KeywordQualityItem = {
  keyword: string
  qualityScore: number | null
  impressions: number
  clicks: number
  conversions: number
  costPerConversion: number | null
}

type KeywordQualityPayload = {
  items: KeywordQualityItem[]
  error: string | null
}

const EMPTY_KEYWORD_QUALITY: KeywordQualityPayload = {
  items: [],
  error: null,
}

type CampaignTypeItem = {
  typeKey: string
  typeLabel: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  conversionsValue: number
}

type CampaignTypesPayload = {
  items: CampaignTypeItem[]
  error: string | null
}

const EMPTY_CAMPAIGN_TYPES: CampaignTypesPayload = {
  items: [],
  error: null,
}

type MonthlyResultsPayload = {
  items: MonthlyResultItem[]
  since: string | null
  until: string | null
  error: string | null
}

const EMPTY_MONTHLY_RESULTS: MonthlyResultsPayload = {
  items: [],
  since: null,
  until: null,
  error: null,
}

type TopKeywordsPayload = { items: TopKeywordItem[]; error: string | null }
type SearchTermsPayload = { items: SearchTermItem[]; error: string | null }

const EMPTY_TOP_KEYWORDS: TopKeywordsPayload = { items: [], error: null }
const EMPTY_SEARCH_TERMS: SearchTermsPayload = { items: [], error: null }

async function fetchTopKeywords(
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  since: string,
  until: string,
  filterClause = ''
): Promise<TopKeywordsPayload> {
  const query = `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      campaign.id,
      campaign.name,
      ad_group.name,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.absolute_top_impression_percentage,
      metrics.top_impression_percentage
    FROM keyword_view
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND campaign.status != 'REMOVED'
      AND ad_group_criterion.status != 'REMOVED'
      AND ad_group_criterion.type = KEYWORD${filterClause}
  `
  const res = await fetchAllGaqlRows(ver, numericId, headers, query)
  if (res.error) return { items: [], error: res.error }
  return { items: aggregateTopKeywords(res.rows, 20), error: null }
}

async function fetchSearchTerms(
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  since: string,
  until: string,
  filterClause = ''
): Promise<SearchTermsPayload> {
  const query = `
    SELECT
      search_term_view.search_term,
      campaign.name,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions
    FROM search_term_view
    WHERE segments.date BETWEEN '${since}' AND '${until}'${filterClause}
  `
  const res = await fetchAllGaqlRows(ver, numericId, headers, query)
  if (res.error) return { items: [], error: res.error }
  return { items: aggregateSearchTerms(res.rows, 60), error: null }
}

function rowObj(row: GaqlRow): Record<string, unknown> {
  return row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
}

function readNestedString(obj: unknown, ...keys: string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const o = obj as Record<string, unknown>
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v) return v
  }
  return undefined
}

function readMetricsConv(m: unknown): { conversions: number; value: number } {
  if (!m || typeof m !== 'object') return { conversions: 0, value: 0 }
  const o = m as Record<string, unknown>
  const conv = Number.parseFloat(String(o.conversions ?? 0)) || 0
  const val = Number.parseFloat(String(o.conversionsValue ?? o.conversions_value ?? 0)) || 0
  return { conversions: conv, value: val }
}

async function fetchConversionBreakdown(
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  since: string,
  until: string,
  filterClause = '',
  fromResource = 'campaign'
): Promise<ConversionBreakdownPayload> {
  const metaQuery = `
    SELECT
      conversion_action.resource_name,
      conversion_action.name,
      conversion_action.primary_for_goal
    FROM conversion_action
    WHERE conversion_action.status != 'REMOVED'
  `
  const metaRes = await fetchAllGaqlRows(ver, numericId, headers, metaQuery)
  const metaMap = new Map<string, { name: string; primaryForGoal: boolean | undefined }>()
  if (!metaRes.error) {
    for (const row of metaRes.rows) {
      const ca = parseConversionActionFields(rowObj(row))
      const rn = ca.resourceName
      if (!rn) continue
      const key = extractConversionActionId(rn)
      if (!key) continue
      const name = ca.name?.trim() || 'Conversão'
      metaMap.set(key, { name, primaryForGoal: ca.primaryForGoal })
    }
  }

  // conversion_action.* não pode ser selecionado FROM campaign/ad_group
  // (PROHIBITED_RESOURCE_TYPE_IN_SELECT_CLAUSE) — nome vem do segmento e
  // primary_for_goal do catálogo carregado acima.
  const metricsQuery = `
    SELECT
      segments.conversion_action,
      segments.conversion_action_name,
      metrics.conversions,
      metrics.conversions_value
    FROM ${fromResource}
    WHERE campaign.status != 'REMOVED'
      AND segments.date BETWEEN '${since}' AND '${until}'${filterClause}
  `
  const metricsRes = await fetchAllGaqlRows(ver, numericId, headers, metricsQuery)
  if (metricsRes.error) {
    return { primary: [], secondary: [], error: metricsRes.error }
  }

  type Agg = {
    resourceName: string
    name: string | null
    conversions: number
    value: number
  }

  const totals = new Map<string, Agg>()
  for (const row of metricsRes.rows) {
    const R = rowObj(row)
    const rn = readConversionActionResourceName(R.segments)
    if (!rn) continue

    const key = extractConversionActionId(rn)
    if (!key) continue

    const segName = readNestedString(R.segments, 'conversionActionName', 'conversion_action_name')
    const { conversions, value } = readMetricsConv(R.metrics)
    const cur =
      totals.get(key) ??
      ({
        resourceName: rn.includes('/') ? rn : buildConversionResourceName(numericId, key),
        name: null,
        conversions: 0,
        value: 0,
      } satisfies Agg)

    cur.conversions += conversions
    cur.value += value
    if (segName?.trim()) cur.name = segName.trim()
    if (!cur.resourceName.includes('/') && rn.includes('/')) cur.resourceName = rn

    totals.set(key, cur)
  }

  const primary: ConversionBreakdownRow[] = []
  const secondary: ConversionBreakdownRow[] = []
  for (const [key, agg] of totals.entries()) {
    if (agg.conversions === 0 && agg.value === 0) continue
    const meta = metaMap.get(key)
    const name = agg.name ?? meta?.name ?? 'Conversão'
    const primaryForGoal = meta?.primaryForGoal
    const rowOut: ConversionBreakdownRow = {
      id: agg.resourceName || buildConversionResourceName(numericId, key),
      name,
      conversions: agg.conversions,
      value: agg.value,
    }
    if (primaryForGoal === false) secondary.push(rowOut)
    else primary.push(rowOut)
  }

  const score = (r: ConversionBreakdownRow) => r.conversions + r.value * 1e-9
  primary.sort((a, b) => score(b) - score(a))
  secondary.sort((a, b) => score(b) - score(a))

  return { primary, secondary, error: null }
}

function parseKeywordTextFromCriterion(crit: unknown): string | null {
  if (!crit || typeof crit !== 'object') return null
  const c = crit as Record<string, unknown>
  const kw = c.keyword
  if (!kw || typeof kw !== 'object') return null
  const t = readNestedString(kw, 'text')
  return t?.trim() ? t.trim() : null
}

function parseQualityScoreFromCriterion(crit: unknown): number | null {
  if (!crit || typeof crit !== 'object') return null
  const c = crit as Record<string, unknown>
  const qi = c.qualityInfo ?? c.quality_info
  if (!qi || typeof qi !== 'object') return null
  const qo = qi as Record<string, unknown>
  const q = qo.qualityScore ?? qo.quality_score
  if (typeof q === 'number' && q >= 1 && q <= 10) return Math.round(q)
  if (typeof q === 'string' && /^\d+$/.test(q)) {
    const n = Number.parseInt(q, 10)
    if (n >= 1 && n <= 10) return n
  }
  return null
}

function parseKeywordViewMetrics(m: unknown): {
  impressions: number
  clicks: number
  conversions: number
  costMicros: number
} {
  if (!m || typeof m !== 'object') {
    return { impressions: 0, clicks: 0, conversions: 0, costMicros: 0 }
  }
  const mo = m as Record<string, unknown>
  return {
    impressions: Number.parseInt(String(mo.impressions ?? '0'), 10) || 0,
    clicks: Number.parseInt(String(mo.clicks ?? '0'), 10) || 0,
    conversions: Number.parseFloat(String(mo.conversions ?? '0')) || 0,
    costMicros: Number.parseInt(String(mo.costMicros ?? mo.cost_micros ?? '0'), 10) || 0,
  }
}

async function fetchKeywordQualityList(
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  since: string,
  until: string,
  filterClause = ''
): Promise<KeywordQualityPayload> {
  const query = `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.quality_info.quality_score,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM keyword_view
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND campaign.status != 'REMOVED'
      AND ad_group_criterion.status != 'REMOVED'
      AND ad_group_criterion.type = KEYWORD${filterClause}
  `
  const res = await fetchAllGaqlRows(ver, numericId, headers, query)
  if (res.error) {
    return { items: [], error: res.error }
  }

  type Agg = {
    displayKeyword: string
    impressions: number
    clicks: number
    conversions: number
    costMicros: number
    qsWeighted: number
    qsWeight: number
  }
  const byKey = new Map<string, Agg>()

  for (const row of res.rows) {
    const R = rowObj(row)
    const crit = R.adGroupCriterion ?? R.ad_group_criterion
    const text = parseKeywordTextFromCriterion(crit)
    if (!text) continue
    const key = text.toLowerCase()
    const qs = parseQualityScoreFromCriterion(crit)
    const met = parseKeywordViewMetrics(R.metrics)
    let a = byKey.get(key)
    if (!a) {
      a = {
        displayKeyword: text,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        costMicros: 0,
        qsWeighted: 0,
        qsWeight: 0,
      }
      byKey.set(key, a)
    }
    a.impressions += met.impressions
    a.clicks += met.clicks
    a.conversions += met.conversions
    a.costMicros += met.costMicros
    if (qs != null && met.impressions > 0) {
      a.qsWeighted += qs * met.impressions
      a.qsWeight += met.impressions
    }
  }

  const items: KeywordQualityItem[] = []
  for (const a of byKey.values()) {
    if (a.impressions === 0 && a.clicks === 0) continue
    const spend = a.costMicros / 1_000_000
    const qualityScore = a.qsWeight > 0 ? Math.round(a.qsWeighted / a.qsWeight) : null
    const costPerConversion = a.conversions > 0 ? spend / a.conversions : null
    items.push({
      keyword: a.displayKeyword,
      qualityScore,
      impressions: a.impressions,
      clicks: a.clicks,
      conversions: a.conversions,
      costPerConversion,
    })
  }

  items.sort((a, b) => {
    const qa = a.qualityScore
    const qb = b.qualityScore
    if (qa != null && qb != null && qa !== qb) return qb - qa
    if (qa != null && qb == null) return -1
    if (qa == null && qb != null) return 1
    if (b.clicks !== a.clicks) return b.clicks - a.clicks
    if (b.conversions !== a.conversions) return b.conversions - a.conversions
    return a.keyword.localeCompare(b.keyword, 'pt')
  })

  const MAX = 400
  return { items: items.slice(0, MAX), error: null }
}

function googleAdsChannelTypeLabel(key: string): string {
  const map: Record<string, string> = {
    UNSPECIFIED: 'Não especificado',
    UNKNOWN: 'Desconhecido',
    SEARCH: 'Search',
    DISPLAY: 'Display',
    PERFORMANCE_MAX: 'Performance Max',
    SHOPPING: 'Shopping',
    VIDEO: 'Vídeo',
    MULTI_CHANNEL: 'Multi-channel',
    LOCAL: 'Local',
    SMART: 'Smart',
    DISCOVERY: 'Discovery',
    HOTEL: 'Hotel',
    DEMAND_GEN: 'Demand Gen',
    APP: 'App',
  }
  if (map[key]) return map[key]
  const t = key.replace(/_/g, ' ').toLowerCase()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : key
}

function parseCampaignChannel(row: GaqlRow): { campaignId: string; channelType: string } | null {
  const R = rowObj(row)
  const camp = R.campaign
  if (!camp || typeof camp !== 'object') return null
  const c = camp as Record<string, unknown>
  const idRaw = c.id
  const id = idRaw != null ? String(idRaw).trim() : ''
  if (!id) return null
  const channelType =
    readNestedString(c, 'advertisingChannelType', 'advertising_channel_type') ?? 'UNSPECIFIED'
  return { campaignId: id, channelType }
}

function parseCampaignTypeRowMetrics(m: unknown): {
  costMicros: number
  impressions: number
  clicks: number
  conversions: number
  conversionsValue: number
} {
  if (!m || typeof m !== 'object') {
    return { costMicros: 0, impressions: 0, clicks: 0, conversions: 0, conversionsValue: 0 }
  }
  const o = m as Record<string, unknown>
  return {
    costMicros: Number.parseInt(String(o.costMicros ?? o.cost_micros ?? '0'), 10) || 0,
    impressions: Number.parseInt(String(o.impressions ?? '0'), 10) || 0,
    clicks: Number.parseInt(String(o.clicks ?? '0'), 10) || 0,
    conversions: Number.parseFloat(String(o.conversions ?? '0')) || 0,
    conversionsValue: Number.parseFloat(String(o.conversionsValue ?? o.conversions_value ?? '0')) || 0,
  }
}

async function fetchCampaignTypesGrouped(
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  since: string,
  until: string,
  filterClause = '',
  fromResource = 'campaign'
): Promise<CampaignTypesPayload> {
  const query = `
    SELECT
      campaign.id,
      campaign.advertising_channel_type,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM ${fromResource}
    WHERE campaign.status != 'REMOVED'
      AND segments.date BETWEEN '${since}' AND '${until}'${filterClause}
  `
  const res = await fetchAllGaqlRows(ver, numericId, headers, query)
  if (res.error) {
    return { items: [], error: res.error }
  }

  type CampBucket = {
    channelType: string
    costMicros: number
    impressions: number
    clicks: number
    conversions: number
    conversionsValue: number
  }
  const byCampaignId = new Map<string, CampBucket>()

  for (const row of res.rows) {
    const parsed = parseCampaignChannel(row)
    if (!parsed) continue
    const met = parseCampaignTypeRowMetrics(rowObj(row).metrics)
    let b = byCampaignId.get(parsed.campaignId)
    if (!b) {
      b = {
        channelType: parsed.channelType,
        costMicros: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionsValue: 0,
      }
      byCampaignId.set(parsed.campaignId, b)
    }
    b.costMicros += met.costMicros
    b.impressions += met.impressions
    b.clicks += met.clicks
    b.conversions += met.conversions
    b.conversionsValue += met.conversionsValue
  }

  const byType = new Map<
    string,
    { costMicros: number; impressions: number; clicks: number; conversions: number; conversionsValue: number }
  >()
  for (const b of byCampaignId.values()) {
    const cur =
      byType.get(b.channelType) ?? {
        costMicros: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionsValue: 0,
      }
    cur.costMicros += b.costMicros
    cur.impressions += b.impressions
    cur.clicks += b.clicks
    cur.conversions += b.conversions
    cur.conversionsValue += b.conversionsValue
    byType.set(b.channelType, cur)
  }

  const items: CampaignTypeItem[] = []
  for (const [typeKey, agg] of byType.entries()) {
    if (
      agg.impressions === 0 &&
      agg.clicks === 0 &&
      agg.conversions === 0 &&
      agg.costMicros === 0
    ) {
      continue
    }
    items.push({
      typeKey,
      typeLabel: googleAdsChannelTypeLabel(typeKey),
      spend: agg.costMicros / 1_000_000,
      impressions: agg.impressions,
      clicks: agg.clicks,
      conversions: agg.conversions,
      conversionsValue: agg.conversionsValue,
    })
  }

  items.sort((a, b) => b.spend - a.spend)
  return { items, error: null }
}

async function fetchGoogleMonthlyResults(
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  until: string,
  filterClause = '',
  months = 6
): Promise<MonthlyResultsPayload> {
  const { since, until: untilCap } = lastNCalendarMonthsWindow(until, months)
  const query = `
    SELECT
      segments.month,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE campaign.status != 'REMOVED'
      AND segments.date BETWEEN '${since}' AND '${untilCap}'${filterClause}
  `
  const res = await fetchAllGaqlRows(ver, numericId, headers, query)
  if (res.error) {
    return { items: [], since, until: untilCap, error: res.error }
  }
  const aggregated = aggregateGoogleMonthlyRows(res.rows)
  const items = fillMonthlyGaps(untilCap, aggregated, months)
  return { items, since, until: untilCap, error: null }
}

async function fetchGoogleCampaignTree(
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  since: string,
  until: string
): Promise<{ tree: ReturnType<typeof buildGoogleTree>; error: string | null }> {
  const dateWhere = `segments.date BETWEEN '${since}' AND '${until}'`
  const queries = {
    campCatalog: `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type FROM campaign WHERE campaign.status != 'REMOVED'`,
    campMetrics: `SELECT campaign.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE campaign.status != 'REMOVED' AND ${dateWhere}`,
    agCatalog: `SELECT ad_group.id, ad_group.name, ad_group.status, campaign.id FROM ad_group WHERE ad_group.status != 'REMOVED' AND campaign.status != 'REMOVED'`,
    agMetrics: `SELECT ad_group.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM ad_group WHERE ad_group.status != 'REMOVED' AND ${dateWhere}`,
    adCatalog: `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, ad_group.id FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED' AND campaign.status != 'REMOVED'`,
    adMetrics: `SELECT ad_group_ad.ad.id, ad_group.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED' AND ${dateWhere}`,
  }
  const [campCat, campMet, agCat, agMet, adCat, adMet, kwRes] = await Promise.all([
    fetchAllGaqlRows(ver, numericId, headers, queries.campCatalog),
    fetchAllGaqlRows(ver, numericId, headers, queries.campMetrics),
    fetchAllGaqlRows(ver, numericId, headers, queries.agCatalog),
    fetchAllGaqlRows(ver, numericId, headers, queries.agMetrics),
    fetchAllGaqlRows(ver, numericId, headers, queries.adCatalog),
    fetchAllGaqlRows(ver, numericId, headers, queries.adMetrics),
    fetchAllGaqlRows(
      ver,
      numericId,
      headers,
      `SELECT
        ad_group.id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM keyword_view
      WHERE segments.date BETWEEN '${since}' AND '${until}'
        AND campaign.status != 'REMOVED'
        AND ad_group_criterion.status != 'REMOVED'
        AND ad_group_criterion.type = KEYWORD`
    ),
  ])
  const firstError =
    campCat.error ||
    campMet.error ||
    agCat.error ||
    agMet.error ||
    adCat.error ||
    adMet.error ||
    kwRes.error ||
    null
  if (campCat.error) return { tree: [], error: campCat.error }
  const tree = attachKeywordsToGoogleTree(
    buildGoogleTree(
      parseCampaignNodes(campCat.rows, campMet.rows),
      parseAdGroupNodes(agCat.rows, agMet.rows),
      parseAdNodes(adCat.rows, adMet.rows)
    ),
    kwRes.rows
  )
  return { tree, error: firstError }
}

function ymdAddOneGoogle(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function fillGoogleDailyGaps(since: string, until: string, daily: GoogleDailyRow[]): GoogleDailyRow[] {
  const map = new Map(daily.map((r) => [r.date, r]))
  const out: GoogleDailyRow[] = []
  for (let d = since; d <= until; d = ymdAddOneGoogle(d)) {
    out.push(
      map.get(d) ?? {
        date: d,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionsValue: 0,
      }
    )
    if (daysBetweenInclusive(since, d) > MAX_RANGE_DAYS) break
  }
  return out
}

async function buildGoogleOverviewBody(
  env: WorkerEnv,
  access: string,
  numericId: string,
  loginId: string | undefined,
  ver: string,
  accountDisplay: string,
  source: 'worker_env' | 'oauth_org',
  since: string,
  until: string,
  compareSince: string | null,
  compareUntil: string | null,
  filters: GoogleDimensionFilters = { campaignIds: [], adGroupId: null, adId: null }
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    'Content-Type': 'application/json',
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim(),
  }
  if (loginId) {
    headers['login-customer-id'] = loginId
  }

  const filterClause = gaqlFilterClause(filters)
  // ad_group.id não existe no resource campaign — com filtro de grupo, agrega a partir de ad_group
  const aggFrom = filters.adGroupId ? 'ad_group' : 'campaign'
  const baseWhere = `campaign.status != 'REMOVED' AND segments.date BETWEEN '${since}' AND '${until}'${filterClause}`

  const aggQuery = `
    SELECT
      campaign.id,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions
    FROM ${aggFrom}
    WHERE ${baseWhere}
  `

  const dailyQuery = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM ${aggFrom}
    WHERE ${baseWhere}
  `

  const [aggRes, dailyRes] = await Promise.all([
    fetchAllGaqlRows(ver, numericId, headers, aggQuery),
    fetchAllGaqlRows(ver, numericId, headers, dailyQuery),
  ])

  if (aggRes.error) {
    return {
      configured: true,
      source,
      accountDisplay,
      error: aggRes.error,
      detail: `Cliente ${numericId}`,
      metrics: [] as Metric[],
      primaryRange: { since, until },
      compareRange: null,
      compareMetrics: null as Metric[] | null,
      daily: [],
      compareDaily: [],
      conversionBreakdown: EMPTY_CONVERSION_BREAKDOWN,
      keywordQuality: EMPTY_KEYWORD_QUALITY,
      campaignTypes: EMPTY_CAMPAIGN_TYPES,
      monthlyResults: EMPTY_MONTHLY_RESULTS,
      demographics: EMPTY_GOOGLE_DEMOGRAPHICS,
      campaignTree: [],
      campaignsError: null,
      topKeywords: EMPTY_TOP_KEYWORDS,
      searchTerms: EMPTY_SEARCH_TERMS,
    }
  }

  const primaryRaw = aggregateFromCampaignRows(aggRes.rows as Parameters<typeof aggregateFromCampaignRows>[0])

  let compareRaw: RawAgg | null = null
  let compareDaily: ReturnType<typeof fillGoogleDailyGaps> = []
  if (compareSince && compareUntil) {
    const cmpWhere = `campaign.status != 'REMOVED' AND segments.date BETWEEN '${compareSince}' AND '${compareUntil}'${filterClause}`
    const cmpAggQuery = `
      SELECT
        campaign.id,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM ${aggFrom}
      WHERE ${cmpWhere}
    `
    const cmpDailyQuery = `
      SELECT
        segments.date,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value
      FROM ${aggFrom}
      WHERE ${cmpWhere}
    `
    const [cmpRes, cmpDailyRes] = await Promise.all([
      fetchAllGaqlRows(ver, numericId, headers, cmpAggQuery),
      fetchAllGaqlRows(ver, numericId, headers, cmpDailyQuery),
    ])
    compareRaw = cmpRes.error
      ? emptyRaw()
      : aggregateFromCampaignRows(cmpRes.rows as Parameters<typeof aggregateFromCampaignRows>[0])
    if (!cmpDailyRes.error) {
      const cmpDailyRaw = aggregateDaily(cmpDailyRes.rows as Parameters<typeof aggregateDaily>[0])
      compareDaily = fillGoogleDailyGaps(compareSince, compareUntil, cmpDailyRaw)
    }
  }

  const metrics = buildGoogleMetrics(primaryRaw, compareRaw)
  const compareMetrics =
    compareSince && compareUntil && compareRaw ? buildCompareStrip(compareRaw) : null
  const dailyRaw = aggregateDaily(dailyRes.rows as Parameters<typeof aggregateDaily>[0])
  const daily = fillGoogleDailyGaps(since, until, dailyRaw)

  const [
    conversionBreakdown,
    keywordQuality,
    campaignTypes,
    monthlyResults,
    demographics,
    campaignTreeRes,
    topKeywords,
    searchTerms,
  ] = await Promise.all([
    fetchConversionBreakdown(ver, numericId, headers, since, until, filterClause, aggFrom),
    fetchKeywordQualityList(ver, numericId, headers, since, until, filterClause),
    fetchCampaignTypesGrouped(ver, numericId, headers, since, until, filterClause, 'campaign'),
    fetchGoogleMonthlyResults(ver, numericId, headers, until, filterClause),
    fetchGoogleDemographicsPayload(ver, numericId, headers, since, until, fetchAllGaqlRows, filterClause),
    fetchGoogleCampaignTree(ver, numericId, headers, since, until),
    fetchTopKeywords(ver, numericId, headers, since, until, filterClause),
    fetchSearchTerms(ver, numericId, headers, since, until, filterClause),
  ])

  return {
    configured: true,
    source,
    accountDisplay,
    error: null,
    detail: `Cliente ${numericId} · ${since} → ${until}`,
    metrics,
    primaryRange: { since, until },
    compareRange:
      compareSince && compareUntil ? { since: compareSince, until: compareUntil } : null,
    compareMetrics,
    daily,
    compareDaily,
    conversionBreakdown,
    keywordQuality,
    campaignTypes,
    monthlyResults,
    demographics,
    campaignTree: campaignTreeRes.tree,
    campaignsError: campaignTreeRes.error,
    topKeywords,
    searchTerms,
  }
}

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const url = new URL(context.request.url)
  const orgId = url.searchParams.get('org_id')?.trim() || ''
  const { since, until, compareSince, compareUntil } = parseRangeParams(url)
  const dimensionFilters = parseGoogleDimensionFilters(url)

  const { env } = context

  if (orgId) {
    if (!(await userCanAccessOrg(env.DB, user, orgId))) {
      return jsonError('Sem acesso a esta organização', 403)
    }
    const conn = await getActiveConnectionForOrg(env.DB, orgId, 'google_ads')
    if (!conn) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: null,
        error: null,
        detail: 'Nenhuma conta Google Ads ligada a esta organização.',
        metrics: [] as Metric[],
        primaryRange: { since, until },
        compareRange: null,
        compareMetrics: null,
        daily: [],
        compareDaily: [],
        conversionBreakdown: EMPTY_CONVERSION_BREAKDOWN,
        keywordQuality: EMPTY_KEYWORD_QUALITY,
        campaignTypes: EMPTY_CAMPAIGN_TYPES,
      monthlyResults: EMPTY_MONTHLY_RESULTS,
        demographics: EMPTY_GOOGLE_DEMOGRAPHICS,
      campaignTree: [],
      campaignsError: null,
      topKeywords: EMPTY_TOP_KEYWORDS,
      searchTerms: EMPTY_SEARCH_TERMS,
      })
    }
    const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
    if (!devToken) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: conn.external_name,
        error: null,
        detail: 'GOOGLE_ADS_DEVELOPER_TOKEN não configurado no Worker.',
        metrics: [] as Metric[],
        primaryRange: { since, until },
        compareRange: null,
        compareMetrics: null,
        daily: [],
        compareDaily: [],
        conversionBreakdown: EMPTY_CONVERSION_BREAKDOWN,
        keywordQuality: EMPTY_KEYWORD_QUALITY,
        campaignTypes: EMPTY_CAMPAIGN_TYPES,
      monthlyResults: EMPTY_MONTHLY_RESULTS,
        demographics: EMPTY_GOOGLE_DEMOGRAPHICS,
      campaignTree: [],
      campaignsError: null,
      topKeywords: EMPTY_TOP_KEYWORDS,
      searchTerms: EMPTY_SEARCH_TERMS,
      })
    }
    const useWorkerSecrets = !conn.oauth_credential_id
    const access = useWorkerSecrets
      ? await getGoogleAccessTokenFromEnv(env)
      : await getValidGoogleAccessTokenFromCredential(env.DB, env, conn.oauth_credential_id)
    const orgSource = useWorkerSecrets ? 'assigned_env' : 'oauth_org'
    if (!access) {
      return json({
        configured: false,
        source: orgSource,
        accountDisplay: conn.external_name,
        error: null,
        detail: useWorkerSecrets
          ? 'Secrets Google não configurados no Worker (refresh token / developer token).'
          : 'Token Google indisponível. Reconecte em Integrações.',
        metrics: [] as Metric[],
        primaryRange: { since, until },
        compareRange: null,
        compareMetrics: null,
        daily: [],
        compareDaily: [],
        conversionBreakdown: EMPTY_CONVERSION_BREAKDOWN,
        keywordQuality: EMPTY_KEYWORD_QUALITY,
        campaignTypes: EMPTY_CAMPAIGN_TYPES,
      monthlyResults: EMPTY_MONTHLY_RESULTS,
        demographics: EMPTY_GOOGLE_DEMOGRAPHICS,
      campaignTree: [],
      campaignsError: null,
      topKeywords: EMPTY_TOP_KEYWORDS,
      searchTerms: EMPTY_SEARCH_TERMS,
      })
    }
    const ver = resolveGoogleApiVersion(env)
    const numericId = customerPathId(conn.external_id)
    const loginId = resolveGoogleLoginCustomerId(env)

    try {
      const accountDisplay =
        conn.external_name?.trim() ||
        (await fetchCustomerDescriptiveName(ver, numericId, {
          Authorization: `Bearer ${access}`,
          'Content-Type': 'application/json',
          'developer-token': devToken,
          ...(loginId ? { 'login-customer-id': loginId } : {}),
        })) ||
        `Cliente ${numericId}`

      const body = await buildGoogleOverviewBody(
        env,
        access,
        numericId,
        loginId,
        ver,
        accountDisplay,
        orgSource,
        since,
        until,
        compareSince,
        compareUntil,
        dimensionFilters
      )
      return json(body)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro Google Ads'
      return json({
        configured: true,
        source: orgSource,
        accountDisplay: conn.external_name ?? `Cliente ${numericId}`,
        error: msg,
        detail: null,
        metrics: [] as Metric[],
        primaryRange: { since, until },
        compareRange: null,
        compareMetrics: null,
        daily: [],
        compareDaily: [],
        conversionBreakdown: EMPTY_CONVERSION_BREAKDOWN,
        keywordQuality: EMPTY_KEYWORD_QUALITY,
        campaignTypes: EMPTY_CAMPAIGN_TYPES,
      monthlyResults: EMPTY_MONTHLY_RESULTS,
        demographics: EMPTY_GOOGLE_DEMOGRAPHICS,
      campaignTree: [],
      campaignsError: null,
      topKeywords: EMPTY_TOP_KEYWORDS,
      searchTerms: EMPTY_SEARCH_TERMS,
      })
    }
  }

  if (user.role !== 'super_admin') {
    return jsonError('org_id é obrigatório', 400)
  }

  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const paramCid = url.searchParams.get('customer_id')?.trim()
  const cid = paramCid || env.GOOGLE_ADS_CUSTOMER_ID?.trim()
  const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()

  if (!cid || !devToken) {
    return json({
      configured: false,
      source: 'worker_env',
      accountDisplay: null,
      error: null,
      detail:
        'Defina GOOGLE_ADS_DEVELOPER_TOKEN no Worker e escolha um cliente na página (ou GOOGLE_ADS_CUSTOMER_ID).',
      metrics: [] as Metric[],
      primaryRange: { since, until },
      compareRange: null,
      compareMetrics: null,
      daily: [],
      compareDaily: [],
      conversionBreakdown: EMPTY_CONVERSION_BREAKDOWN,
      keywordQuality: EMPTY_KEYWORD_QUALITY,
      campaignTypes: EMPTY_CAMPAIGN_TYPES,
      monthlyResults: EMPTY_MONTHLY_RESULTS,
      demographics: EMPTY_GOOGLE_DEMOGRAPHICS,
      campaignTree: [],
      campaignsError: null,
      topKeywords: EMPTY_TOP_KEYWORDS,
      searchTerms: EMPTY_SEARCH_TERMS,
    })
  }

  const access = await getGoogleAccessTokenFromEnv(env)
  if (!access) {
    return json({
      configured: false,
      source: 'worker_env',
      accountDisplay: null,
      error: null,
      detail: 'Defina GOOGLE_ADS_REFRESH_TOKEN + CLIENT_ID/SECRET para obter access token.',
      metrics: [] as Metric[],
      primaryRange: { since, until },
      compareRange: null,
      compareMetrics: null,
      daily: [],
      compareDaily: [],
      conversionBreakdown: EMPTY_CONVERSION_BREAKDOWN,
      keywordQuality: EMPTY_KEYWORD_QUALITY,
      campaignTypes: EMPTY_CAMPAIGN_TYPES,
      monthlyResults: EMPTY_MONTHLY_RESULTS,
      demographics: EMPTY_GOOGLE_DEMOGRAPHICS,
      campaignTree: [],
      campaignsError: null,
      topKeywords: EMPTY_TOP_KEYWORDS,
      searchTerms: EMPTY_SEARCH_TERMS,
    })
  }

  const ver = resolveGoogleApiVersion(env)
  const numericId = customerPathId(cid)
  const loginId = resolveGoogleLoginCustomerId(env)

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
      'developer-token': devToken,
    }
    if (loginId) {
      headers['login-customer-id'] = loginId
    }

    const accountDisplay =
      (await fetchCustomerDescriptiveName(ver, numericId, headers)) || `Cliente ${numericId}`
    const body = await buildGoogleOverviewBody(
      env,
      access,
      numericId,
      loginId,
      ver,
      accountDisplay,
      'worker_env',
      since,
      until,
      compareSince,
      compareUntil,
      dimensionFilters
    )
    return json(body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro Google Ads'
    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay: `Cliente ${numericId}`,
      error: msg,
      detail: null,
      metrics: [] as Metric[],
      primaryRange: { since, until },
      compareRange: null,
      compareMetrics: null,
      daily: [],
      compareDaily: [],
      conversionBreakdown: EMPTY_CONVERSION_BREAKDOWN,
      keywordQuality: EMPTY_KEYWORD_QUALITY,
      campaignTypes: EMPTY_CAMPAIGN_TYPES,
      monthlyResults: EMPTY_MONTHLY_RESULTS,
      demographics: EMPTY_GOOGLE_DEMOGRAPHICS,
      campaignTree: [],
      campaignsError: null,
      topKeywords: EMPTY_TOP_KEYWORDS,
      searchTerms: EMPTY_SEARCH_TERMS,
    })
  }
}
