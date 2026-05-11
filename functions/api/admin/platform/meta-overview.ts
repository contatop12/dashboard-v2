import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json, jsonError } from '../../../_lib/json'
import {
  decryptMetaAccessToken,
  getActiveConnectionForOrg,
} from '../../../_lib/org-platform-credentials'

type Metric = { label: string; value: string; deltaPct?: number | null }

const MAX_RANGE_DAYS = 366

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n)
}

function normalizeActId(raw: string): string {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return ''
  if (t.startsWith('act_')) return t
  return `act_${t}`
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

async function resolveAdAccountId(token: string, env: WorkerEnv): Promise<string | null> {
  const configured = env.META_AD_ACCOUNT_ID?.trim()
  if (configured) return normalizeActId(configured)
  const r = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?fields=account_id&limit=1&access_token=${encodeURIComponent(token)}`
  )
  const j = (await r.json()) as { data?: { account_id?: string }[]; error?: { message?: string } }
  const id = j.data?.[0]?.account_id
  if (!id) return null
  return normalizeActId(id)
}

async function fetchAdAccountDisplay(token: string, actId: string): Promise<string | null> {
  const u = new URL(`https://graph.facebook.com/v21.0/${actId}`)
  u.searchParams.set('fields', 'name,account_id')
  u.searchParams.set('access_token', token)
  const r = await fetch(u.toString())
  const j = (await r.json()) as {
    name?: string
    error?: { message?: string }
  }
  if (!r.ok || j.error || !j.name?.trim()) return null
  return j.name.trim()
}

function parseLeadsFromRow(row: Record<string, unknown>): number {
  const actions = row.actions
  if (!Array.isArray(actions)) return 0
  let n = 0
  for (const a of actions) {
    const o = a as { action_type?: string; value?: string }
    const t = String(o.action_type ?? '')
    if (t.includes('lead') || t.includes('onsite_conversion') || t === 'offsite_conversion.fb_pixel_lead') {
      n += Number.parseFloat(String(o.value ?? '0')) || 0
    }
  }
  return Math.round(n)
}

type RawAgg = {
  spend: number
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  frequency: number
  leads: number
}

function rowToRaw(row: Record<string, string | number> | undefined): RawAgg | null {
  if (!row) return null
  const spend = Number.parseFloat(String(row.spend ?? 0)) || 0
  const impressions = Number.parseFloat(String(row.impressions ?? 0)) || 0
  const reach = Number.parseFloat(String(row.reach ?? 0)) || 0
  const clicks = Number.parseFloat(String(row.clicks ?? 0)) || 0
  let ctr = Number.parseFloat(String(row.ctr ?? 0)) || 0
  let cpc = Number.parseFloat(String(row.cpc ?? 0)) || 0
  const cpm = Number.parseFloat(String(row.cpm ?? 0)) || 0
  const frequency = Number.parseFloat(String(row.frequency ?? 0)) || 0
  const leads = parseLeadsFromRow(row as Record<string, unknown>)
  if (impressions > 0 && ctr === 0 && clicks > 0) ctr = (clicks / impressions) * 100
  if (clicks > 0 && cpc === 0 && spend > 0) cpc = spend / clicks
  return { spend, impressions, reach, clicks, ctr, cpc, cpm, frequency, leads }
}

function deltaPct(primary: number, compare: number): number | null {
  if (compare === 0) return primary === 0 ? 0 : null
  return ((primary - compare) / compare) * 100
}

function buildMetrics(primary: RawAgg, compare: RawAgg | null): Metric[] {
  const d = (p: number, c: number) => (compare ? deltaPct(p, c) : null)
  const p = primary
  const c = compare
  return [
    { label: 'Valor gasto', value: fmtBRL(p.spend), deltaPct: c ? d(p.spend, c.spend) : null },
    { label: 'Alcance', value: fmtInt(p.reach), deltaPct: c ? d(p.reach, c.reach) : null },
    { label: 'Impressões', value: fmtInt(p.impressions), deltaPct: c ? d(p.impressions, c.impressions) : null },
    { label: 'CPM', value: fmtBRL(p.cpm), deltaPct: c ? d(p.cpm, c.cpm) : null },
    { label: 'CTR (link)', value: `${p.ctr.toFixed(2)}%`, deltaPct: c ? d(p.ctr, c.ctr) : null },
    { label: 'CPC (link)', value: fmtBRL(p.cpc), deltaPct: c ? d(p.cpc, c.cpc) : null },
    { label: 'Frequência', value: p.frequency.toFixed(2), deltaPct: c ? d(p.frequency, c.frequency) : null },
    { label: 'Leads', value: fmtInt(p.leads), deltaPct: c ? d(p.leads, c.leads) : null },
  ]
}

/** Valores do período de comparação (faixa “Período anterior” no grid). */
function buildCompareMetricsStrip(c: RawAgg): Metric[] {
  return [
    { label: 'Valor gasto', value: fmtBRL(c.spend) },
    { label: 'Alcance', value: fmtInt(c.reach) },
    { label: 'Impressões', value: fmtInt(c.impressions) },
    { label: 'CPM', value: fmtBRL(c.cpm) },
    { label: 'CTR (link)', value: `${c.ctr.toFixed(2)}%` },
    { label: 'CPC (link)', value: fmtBRL(c.cpc) },
    { label: 'Frequência', value: c.frequency.toFixed(2) },
    { label: 'Leads', value: fmtInt(c.leads) },
  ]
}

async function fetchInsightsAggregate(
  token: string,
  actId: string,
  since: string,
  until: string
): Promise<{ row: Record<string, string | number> | null; error?: string }> {
  const fields = [
    'spend',
    'impressions',
    'reach',
    'clicks',
    'ctr',
    'cpc',
    'cpm',
    'frequency',
    'actions',
  ].join(',')
  const iu = new URL(`https://graph.facebook.com/v21.0/${actId}/insights`)
  iu.searchParams.set('fields', fields)
  iu.searchParams.set('time_range', JSON.stringify({ since, until }))
  iu.searchParams.set('access_token', token)

  const ir = await fetch(iu.toString())
  const idata = (await ir.json()) as {
    data?: Record<string, string | number>[]
    error?: { message?: string }
  }
  if (!ir.ok || idata.error) {
    return { row: null, error: idata.error?.message || 'Graph API insights falhou' }
  }
  return { row: idata.data?.[0] ?? null }
}

async function fetchInsightsDaily(
  token: string,
  actId: string,
  since: string,
  until: string
): Promise<DailyRow[]> {
  const fields = ['spend', 'impressions', 'reach', 'clicks', 'actions', 'date_start'].join(',')
  const iu = new URL(`https://graph.facebook.com/v21.0/${actId}/insights`)
  iu.searchParams.set('fields', fields)
  iu.searchParams.set('time_range', JSON.stringify({ since, until }))
  iu.searchParams.set('time_increment', '1')
  iu.searchParams.set('access_token', token)
  const ir = await fetch(iu.toString())
  const idata = (await ir.json()) as {
    data?: Record<string, string | number | unknown>[]
    error?: { message?: string }
  }
  if (!ir.ok || idata.error || !idata.data?.length) return []
  return idata.data.map((row) => ({
    date: String(row.date_start ?? ''),
    spend: Number.parseFloat(String(row.spend ?? 0)) || 0,
    reach: Number.parseFloat(String(row.reach ?? 0)) || 0,
    impressions: Number.parseFloat(String(row.impressions ?? 0)) || 0,
    clicks: Number.parseFloat(String(row.clicks ?? 0)) || 0,
    leads: parseLeadsFromRow(row as Record<string, unknown>),
  }))
}

async function fetchPlacementsBreakdown(
  token: string,
  actId: string,
  since: string,
  until: string
): Promise<Array<{ name: string; spend: number }>> {
  const iu = new URL(`https://graph.facebook.com/v21.0/${actId}/insights`)
  iu.searchParams.set('fields', 'spend,publisher_platform')
  iu.searchParams.set('time_range', JSON.stringify({ since, until }))
  iu.searchParams.set('breakdowns', 'publisher_platform')
  iu.searchParams.set('access_token', token)
  const ir = await fetch(iu.toString())
  const idata = (await ir.json()) as {
    data?: { spend?: string; publisher_platform?: string }[]
    error?: { message?: string }
  }
  if (!ir.ok || idata.error || !idata.data?.length) return []
  const map = new Map<string, number>()
  for (const row of idata.data) {
    const name = String(row.publisher_platform ?? 'outro')
    const spend = Number.parseFloat(String(row.spend ?? 0)) || 0
    map.set(name, (map.get(name) ?? 0) + spend)
  }
  return [...map.entries()].map(([name, spend]) => ({ name, spend }))
}

type DailyRow = {
  date: string
  spend: number
  reach: number
  impressions: number
  clicks: number
  leads: number
}

function ymdAddOne(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Garante um ponto por dia no intervalo (Meta às vezes omite dias zerados). */
function fillDailyGaps(since: string, until: string, daily: DailyRow[]): DailyRow[] {
  const map = new Map(daily.map((r) => [r.date, r]))
  const out: DailyRow[] = []
  for (let d = since; d <= until; d = ymdAddOne(d)) {
    out.push(
      map.get(d) ?? {
        date: d,
        spend: 0,
        reach: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
      }
    )
    if (daysBetweenInclusive(since, d) > MAX_RANGE_DAYS) break
  }
  return out
}

type AdInsightRow = {
  ad_id: string
  ad_name: string
  spend: number
  leads: number
  impressions: number
  linkClicks: number
}

async function fetchAdLevelInsights(
  token: string,
  actId: string,
  since: string,
  until: string
): Promise<AdInsightRow[]> {
  const fields = ['ad_id', 'ad_name', 'spend', 'impressions', 'inline_link_clicks', 'actions'].join(',')
  const merged = new Map<string, AdInsightRow>()
  let url: string | null =
    `https://graph.facebook.com/v21.0/${actId}/insights?fields=${encodeURIComponent(fields)}&level=ad&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}&limit=500&access_token=${encodeURIComponent(token)}`

  for (let page = 0; page < 20 && url; page++) {
    const r = await fetch(url)
    const j = (await r.json()) as {
      data?: {
        ad_id?: string
        ad_name?: string
        spend?: string
        impressions?: string
        inline_link_clicks?: string
        actions?: unknown[]
      }[]
      paging?: { next?: string }
      error?: { message?: string }
    }
    if (!r.ok || j.error) break
    for (const row of j.data ?? []) {
      const id = String(row.ad_id ?? '').trim()
      if (!id) continue
      const spend = Number.parseFloat(String(row.spend ?? 0)) || 0
      const impressions = Number.parseFloat(String(row.impressions ?? 0)) || 0
      const linkClicks = Number.parseFloat(String(row.inline_link_clicks ?? 0)) || 0
      const leads = parseLeadsFromRow(row as Record<string, unknown>)
      const name = String(row.ad_name ?? 'Anúncio').trim() || 'Anúncio'
      const cur = merged.get(id)
      if (!cur)
        merged.set(id, { ad_id: id, ad_name: name, spend, leads, impressions, linkClicks })
      else {
        cur.spend += spend
        cur.leads += leads
        cur.impressions += impressions
        cur.linkClicks += linkClicks
        if (name && name !== 'Anúncio') cur.ad_name = name
      }
    }
    url = j.paging?.next ?? null
  }

  return [...merged.values()].sort((a, b) => b.spend - a.spend).slice(0, 15)
}

type AdObj = {
  name?: string
  effective_status?: string
  creative?: { thumbnail_url?: string; image_url?: string }
  error?: { message?: string }
}

async function fetchAdsByIdsBatch(
  token: string,
  adIds: string[]
): Promise<Map<string, AdObj>> {
  const map = new Map<string, AdObj>()
  const chunk = 45
  for (let i = 0; i < adIds.length; i += chunk) {
    const slice = adIds.slice(i, i + chunk)
    const u = new URL('https://graph.facebook.com/v21.0/')
    u.searchParams.set('ids', slice.join(','))
    u.searchParams.set('fields', 'name,effective_status,creative{thumbnail_url,image_url}')
    u.searchParams.set('access_token', token)
    const r = await fetch(u.toString())
    const j = (await r.json()) as Record<string, AdObj | { error?: { message?: string } }>
    for (const id of slice) {
      const o = j[id]
      if (o && typeof o === 'object' && !('error' in o && (o as AdObj).error)) {
        map.set(id, o as AdObj)
      }
    }
  }
  return map
}

const CREATIVE_GRADIENTS = [
  'linear-gradient(145deg, #1a3a5c 0%, #0d1b2a 100%)',
  'linear-gradient(145deg, #2d1b69 0%, #1a0f3c 100%)',
  'linear-gradient(145deg, #0f3d2b 0%, #061a12 100%)',
  'linear-gradient(145deg, #3d2b0a 0%, #1f1505 100%)',
  'linear-gradient(145deg, #1a2d3d 0%, #0a151f 100%)',
  'linear-gradient(145deg, #3d1a1a 0%, #200d0d 100%)',
]

async function fetchCreativesForPeriod(
  token: string,
  actId: string,
  since: string,
  until: string
): Promise<Record<string, unknown>[]> {
  try {
    const rows = await fetchAdLevelInsights(token, actId, since, until)
    if (!rows.length) return []
    const thumbs = await fetchAdsByIdsBatch(
      token,
      rows.map((r) => r.ad_id)
    )
    return rows.map((row, i) => {
      const ad = thumbs.get(row.ad_id)
      const img = ad?.creative?.image_url || ad?.creative?.thumbnail_url || null
      const st = String(ad?.effective_status ?? 'ACTIVE').toUpperCase()
      const status =
        st.includes('PAUSED') || st.includes('ARCHIVED') || st.includes('DELETED') ? 'paused' : 'active'
      const leads = row.leads
      const spend = row.spend
      const impressions = row.impressions
      const linkClicks = row.linkClicks
      const name = (ad?.name?.trim() || row.ad_name).trim() || 'Anúncio'
      return {
        id: row.ad_id,
        name,
        image: img,
        gradient: CREATIVE_GRADIENTS[i % CREATIVE_GRADIENTS.length],
        status,
        spend,
        leads,
        impressions,
        linkClicks,
      }
    })
  } catch {
    return []
  }
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

async function buildMetaResponse(
  token: string,
  actId: string,
  accountDisplay: string | null,
  source: 'worker_env' | 'oauth_org',
  since: string,
  until: string,
  compareSince: string | null,
  compareUntil: string | null
): Promise<Record<string, unknown>> {
  const [agg, dailyRaw, places, creatives] = await Promise.all([
    fetchInsightsAggregate(token, actId, since, until),
    fetchInsightsDaily(token, actId, since, until),
    fetchPlacementsBreakdown(token, actId, since, until),
    fetchCreativesForPeriod(token, actId, since, until),
  ])

  const daily = fillDailyGaps(since, until, dailyRaw)

  if (agg.error || !agg.row) {
    return {
      configured: true,
      source,
      accountDisplay,
      adAccountId: actId,
      error: agg.error ?? 'Sem dados agregados no período.',
      detail: actId,
      metrics: [] as Metric[],
      primaryRange: { since, until },
      compareRange: null,
      compareMetrics: null as Metric[] | null,
      daily: [] as DailyRow[],
      placements: [] as { name: string; value: number }[],
      creatives: [] as Record<string, unknown>[],
    }
  }

  const primaryRaw = rowToRaw(agg.row as Record<string, string | number>)
  if (!primaryRaw) {
    return {
      configured: true,
      source,
      accountDisplay,
      adAccountId: actId,
      error: 'Resposta de insights vazia.',
      detail: actId,
      metrics: [] as Metric[],
      primaryRange: { since, until },
      compareRange: null,
      compareMetrics: null as Metric[] | null,
      daily,
      placements: [],
      creatives,
    }
  }

  let compareRaw: RawAgg | null = null
  if (compareSince && compareUntil) {
    const c = await fetchInsightsAggregate(token, actId, compareSince, compareUntil)
    compareRaw = rowToRaw(c.row as Record<string, string | number>) ?? {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      frequency: 0,
      leads: 0,
    }
  }

  const metrics = buildMetrics(primaryRaw, compareRaw)
  const compareMetrics =
    compareSince && compareUntil && compareRaw ? buildCompareMetricsStrip(compareRaw) : null
  const totalSpendPlaces = places.reduce((s, p) => s + p.spend, 0) || 1
  const placements = places.map((p) => ({
    name: labelPlatform(p.name),
    value: Math.round((p.spend / totalSpendPlaces) * 1000) / 10,
  }))

  return {
    configured: true,
    source,
    accountDisplay,
    adAccountId: actId,
    error: null,
    detail: `Conta ${actId} · ${since} → ${until}`,
    metrics,
    primaryRange: { since, until },
    compareRange:
      compareSince && compareUntil ? { since: compareSince, until: compareUntil } : null,
    compareMetrics,
    daily,
    placements,
    creatives,
  }
}

function labelPlatform(key: string): string {
  const k = key.toLowerCase()
  if (k === 'facebook') return 'Feed'
  if (k === 'instagram') return 'Instagram'
  if (k === 'audience_network') return 'Audience Network'
  if (k === 'messenger') return 'Messenger'
  if (k === 'threads') return 'Threads'
  return key
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

  if (orgId) {
    if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
      return jsonError('Sem acesso a esta organização', 403)
    }
    const conn = await getActiveConnectionForOrg(context.env.DB, orgId, 'meta_ads')
    if (!conn) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: null,
        error: null,
        detail: 'Nenhuma conta Meta Ads ligada a esta organização (Integrações).',
        metrics: [] as Metric[],
        primaryRange: { since, until },
        compareRange: null,
        daily: [],
        placements: [],
        creatives: [],
      })
    }
    const token = await decryptMetaAccessToken(context.env.DB, context.env, conn.oauth_credential_id)
    if (!token) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: conn.external_name,
        error: null,
        detail: 'Token Meta indisponível. Reconecte em Integrações.',
        metrics: [] as Metric[],
        primaryRange: { since, until },
        compareRange: null,
        daily: [],
        placements: [],
        creatives: [],
      })
    }
    const actId = normalizeActId(conn.external_id)
    const accountDisplay =
      conn.external_name?.trim() || (await fetchAdAccountDisplay(token, actId)) || actId
    const body = await buildMetaResponse(
      token,
      actId,
      accountDisplay,
      'oauth_org',
      since,
      until,
      compareSince,
      compareUntil
    )
    return json(body)
  }

  if (user.role !== 'super_admin') {
    return jsonError('org_id é obrigatório', 400)
  }

  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const token = context.env.META_ACCESS_TOKEN?.trim()
  if (!token) {
    return json({
      configured: false,
      source: 'worker_env',
      accountDisplay: null,
      error: null,
      detail: 'Defina o secret META_ACCESS_TOKEN no Worker.',
      metrics: [] as Metric[],
      primaryRange: { since, until },
      compareRange: null,
      daily: [],
      placements: [],
      creatives: [],
    })
  }

  try {
    const paramAct = url.searchParams.get('ad_account_id')?.trim()
    let actId: string | null = null
    if (paramAct) {
      actId = normalizeActId(paramAct)
    } else {
      actId = await resolveAdAccountId(token, context.env)
    }
    const accountDisplay = actId ? (await fetchAdAccountDisplay(token, actId)) || actId : null
    if (!actId) {
      return json({
        configured: true,
        source: 'worker_env',
        accountDisplay,
        error:
          'Nenhuma conta de anúncios acessível com este token. Defina META_AD_ACCOUNT_ID ou conceda ads_read/ads_management.',
        detail: null,
        metrics: [] as Metric[],
        primaryRange: { since, until },
        compareRange: null,
        daily: [],
        placements: [],
        creatives: [],
      })
    }

    const body = await buildMetaResponse(
      token,
      actId,
      accountDisplay,
      'worker_env',
      since,
      until,
      compareSince,
      compareUntil
    )
    return json(body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro Meta'
    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay: null,
      error: msg,
      detail: null,
      metrics: [] as Metric[],
      primaryRange: { since, until },
      compareRange: null,
      daily: [],
      placements: [],
      creatives: [],
    })
  }
}
