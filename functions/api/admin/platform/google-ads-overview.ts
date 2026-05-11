import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json, jsonError } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'
import {
  getActiveConnectionForOrg,
  getValidGoogleAccessTokenFromCredential,
} from '../../../_lib/org-platform-credentials'

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

function customerPathId(raw: string): string {
  return raw.trim().replace(/^customers\//, '').replace(/-/g, '')
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
      error?: { message?: string; status?: string }
    }
    if (!res.ok || j.error) {
      return { rows: [], error: j.error?.message || `Google Ads API (${res.status})` }
    }
    rows.push(...(j.results ?? []))
    pageToken = j.nextPageToken
    if (!pageToken) break
  }
  return { rows }
}

function aggregateDaily(
  rows: {
    segments?: { date?: string }
    metrics?: {
      costMicros?: string
      impressions?: string
      clicks?: string
      conversions?: string | number
    }
  }[]
): Array<{ date: string; spend: number; impressions: number; clicks: number; conversions: number }> {
  const byDate = new Map<string, RawAgg>()
  for (const row of rows) {
    const d = row.segments?.date
    if (!d) continue
    const m = row.metrics
    if (!m) continue
    const cur = byDate.get(d) ?? emptyRaw()
    cur.spend += (Number.parseInt(String(m.costMicros ?? '0'), 10) || 0) / 1_000_000
    cur.impressions += Number.parseInt(String(m.impressions ?? '0'), 10) || 0
    cur.clicks += Number.parseInt(String(m.clicks ?? '0'), 10) || 0
    cur.conversions += Number.parseFloat(String(m.conversions ?? '0')) || 0
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
    }))
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
  compareUntil: string | null
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    'Content-Type': 'application/json',
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim(),
  }
  if (loginId) {
    headers['login-customer-id'] = customerPathId(loginId)
  }

  const baseWhere = `campaign.status != 'REMOVED' AND segments.date BETWEEN '${since}' AND '${until}'`

  const aggQuery = `
    SELECT
      campaign.id,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions
    FROM campaign
    WHERE ${baseWhere}
  `

  const dailyQuery = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions
    FROM campaign
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
    }
  }

  const primaryRaw = aggregateFromCampaignRows(aggRes.rows as Parameters<typeof aggregateFromCampaignRows>[0])

  let compareRaw: RawAgg | null = null
  if (compareSince && compareUntil) {
    const cmpWhere = `campaign.status != 'REMOVED' AND segments.date BETWEEN '${compareSince}' AND '${compareUntil}'`
    const cmpQuery = `
      SELECT
        campaign.id,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM campaign
      WHERE ${cmpWhere}
    `
    const cmpRes = await fetchAllGaqlRows(ver, numericId, headers, cmpQuery)
    compareRaw = cmpRes.error
      ? emptyRaw()
      : aggregateFromCampaignRows(cmpRes.rows as Parameters<typeof aggregateFromCampaignRows>[0])
  }

  const metrics = buildGoogleMetrics(primaryRaw, compareRaw)
  const compareMetrics =
    compareSince && compareUntil && compareRaw ? buildCompareStrip(compareRaw) : null
  const daily = aggregateDaily(dailyRes.rows as Parameters<typeof aggregateDaily>[0])

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
      })
    }
    const access = await getValidGoogleAccessTokenFromCredential(env.DB, env, conn.oauth_credential_id)
    if (!access) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: conn.external_name,
        error: null,
        detail: 'Token Google indisponível. Reconecte em Integrações.',
        metrics: [] as Metric[],
        primaryRange: { since, until },
        compareRange: null,
        compareMetrics: null,
        daily: [],
      })
    }
    const rawVer = env.GOOGLE_ADS_API_VERSION?.trim() || 'v17'
    const ver = rawVer.startsWith('v') ? rawVer : `v${rawVer}`
    const numericId = customerPathId(conn.external_id)
    const loginId = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim()

    try {
      const accountDisplay =
        conn.external_name?.trim() ||
        (await fetchCustomerDescriptiveName(ver, numericId, {
          Authorization: `Bearer ${access}`,
          'Content-Type': 'application/json',
          'developer-token': devToken,
          ...(loginId ? { 'login-customer-id': customerPathId(loginId) } : {}),
        })) ||
        `Cliente ${numericId}`

      const body = await buildGoogleOverviewBody(
        env,
        access,
        numericId,
        loginId,
        ver,
        accountDisplay,
        'oauth_org',
        since,
        until,
        compareSince,
        compareUntil
      )
      return json(body)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro Google Ads'
      return json({
        configured: true,
        source: 'oauth_org',
        accountDisplay: conn.external_name ?? `Cliente ${numericId}`,
        error: msg,
        detail: null,
        metrics: [] as Metric[],
        primaryRange: { since, until },
        compareRange: null,
        compareMetrics: null,
        daily: [],
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
    })
  }

  const rawVer = env.GOOGLE_ADS_API_VERSION?.trim() || 'v17'
  const ver = rawVer.startsWith('v') ? rawVer : `v${rawVer}`
  const numericId = customerPathId(cid)
  const loginId = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim()

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
      'developer-token': devToken,
    }
    if (loginId) {
      headers['login-customer-id'] = customerPathId(loginId)
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
      compareUntil
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
    })
  }
}
