import type { WorkerEnv } from './worker-env'
import {
  parseLeadsFromRow,
  parseObjectiveResults,
  sumActionValues,
} from './meta-conversions'

export type MetaAdAccountRef = { id: string; name: string; account_id: string }

export type MetaAccountMetricsRow = {
  id: string
  accountId: string
  name: string
  spend: number
  impressions: number
  reach: number
  clicks: number
  linkClicks: number
  leads: number
  metaResults: number
  ctr: number
  cpc: number
  cpm: number
  frequency: number
  costPerResult: number | null
  error: string | null
}

function normalizeActId(raw: string): string {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return ''
  if (t.startsWith('act_')) return t
  return `act_${t}`
}

export function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export function yesterdayYmd(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function defaultLast30Ymd(): { since: string; until: string } {
  const u = new Date()
  const until = u.toISOString().slice(0, 10)
  const s = new Date(u)
  s.setUTCDate(s.getUTCDate() - 29)
  return { since: s.toISOString().slice(0, 10), until }
}

export function parseAccountsOverviewRange(
  sinceParam: string,
  untilParam: string,
  preset?: string | null
): { since: string; until: string } {
  if (preset === 'yesterday') {
    const y = yesterdayYmd()
    return { since: y, until: y }
  }
  let since = isYmd(sinceParam) ? sinceParam : ''
  let until = isYmd(untilParam) ? untilParam : ''
  if (!since || !until) {
    const d = defaultLast30Ymd()
    since = d.since
    until = d.until
  }
  return { since, until }
}

export async function listMetaAdAccountsFromEnv(env: WorkerEnv, token: string): Promise<{
  accounts: MetaAdAccountRef[]
  error: string | null
}> {
  const bizId = env.META_BUSINESS_ID?.trim()
  const merged: MetaAdAccountRef[] = []
  const seen = new Set<string>()

  try {
    if (bizId) {
      const [ownedR, clientR] = await Promise.all([
        fetch(
          `https://graph.facebook.com/v21.0/${bizId}/owned_ad_accounts?fields=name,account_id&limit=200&access_token=${encodeURIComponent(token)}`
        ),
        fetch(
          `https://graph.facebook.com/v21.0/${bizId}/client_ad_accounts?fields=name,account_id&limit=200&access_token=${encodeURIComponent(token)}`
        ),
      ])
      const [ownedD, clientD] = (await Promise.all([ownedR.json(), clientR.json()])) as [
        { data?: { name?: string; account_id?: string }[] },
        { data?: { name?: string; account_id?: string }[] },
      ]
      for (const a of [...(ownedD.data ?? []), ...(clientD.data ?? [])]) {
        if (!a.account_id || seen.has(a.account_id)) continue
        seen.add(a.account_id)
        const id = normalizeActId(a.account_id)
        merged.push({ id, account_id: a.account_id, name: (a.name ?? id).trim() || id })
      }
    } else {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=name,account_id&limit=200&access_token=${encodeURIComponent(token)}`
      )
      const d = (await r.json()) as { data?: { name?: string; account_id?: string }[]; error?: { message?: string } }
      if (!r.ok || d.error) {
        return { accounts: [], error: d.error?.message || 'Graph API falhou ao listar ad accounts' }
      }
      for (const a of d.data ?? []) {
        if (!a.account_id || seen.has(a.account_id)) continue
        seen.add(a.account_id)
        const id = normalizeActId(a.account_id)
        merged.push({ id, account_id: a.account_id, name: (a.name ?? id).trim() || id })
      }
    }
  } catch (e) {
    return { accounts: [], error: e instanceof Error ? e.message : 'Erro ao listar contas Meta' }
  }

  merged.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  return { accounts: merged, error: null }
}

function rowToMetrics(row: Record<string, string | number> | null): Omit<MetaAccountMetricsRow, 'id' | 'accountId' | 'name' | 'error'> {
  if (!row) {
    return {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      linkClicks: 0,
      leads: 0,
      metaResults: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      frequency: 0,
      costPerResult: null,
    }
  }
  const r = row as Record<string, unknown>
  const spend = Number.parseFloat(String(row.spend ?? 0)) || 0
  const impressions = Number.parseFloat(String(row.impressions ?? 0)) || 0
  const reach = Number.parseFloat(String(row.reach ?? 0)) || 0
  const clicks = Number.parseFloat(String(row.clicks ?? 0)) || 0
  const linkClicks =
    Number.parseFloat(String(row.inline_link_clicks ?? 0)) ||
    sumActionValues(r.actions, (t) => t === 'link_click' || t.includes('link_click'))
  let ctr = Number.parseFloat(String(row.ctr ?? 0)) || 0
  let cpc = Number.parseFloat(String(row.cpc ?? 0)) || 0
  const cpm = Number.parseFloat(String(row.cpm ?? 0)) || 0
  const frequency = Number.parseFloat(String(row.frequency ?? 0)) || 0
  const leads = parseLeadsFromRow(r)
  const metaResults = parseObjectiveResults(r)
  if (impressions > 0 && linkClicks > 0) ctr = (linkClicks / impressions) * 100
  else if (impressions > 0 && ctr === 0 && clicks > 0) ctr = (clicks / impressions) * 100
  if (linkClicks > 0 && spend > 0) cpc = spend / linkClicks
  else if (clicks > 0 && cpc === 0 && spend > 0) cpc = spend / clicks
  const resultCount = metaResults > 0 ? metaResults : leads
  const costPerResult = resultCount > 0 ? spend / resultCount : null
  return {
    spend,
    impressions,
    reach,
    clicks,
    linkClicks,
    leads,
    metaResults,
    ctr,
    cpc,
    cpm,
    frequency,
    costPerResult,
  }
}

async function fetchMetaAccountInsights(
  token: string,
  actId: string,
  since: string,
  until: string
): Promise<{ row: Record<string, string | number> | null; error: string | null }> {
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
    'inline_link_clicks',
    'objective_results',
    'results',
    'conversions',
  ].join(',')
  const iu = new URL(`https://graph.facebook.com/v21.0/${actId}/insights`)
  iu.searchParams.set('fields', fields)
  iu.searchParams.set('time_range', JSON.stringify({ since, until }))
  iu.searchParams.set('access_token', token)
  try {
    const ir = await fetch(iu.toString())
    const idata = (await ir.json()) as {
      data?: Record<string, string | number>[]
      error?: { message?: string }
    }
    if (!ir.ok || idata.error) {
      return { row: null, error: idata.error?.message || 'Insights indisponíveis' }
    }
    return { row: idata.data?.[0] ?? null, error: null }
  } catch (e) {
    return { row: null, error: e instanceof Error ? e.message : 'Erro ao buscar insights' }
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++
      results[idx] = await fn(items[idx], idx)
    }
  }
  const workers = Math.min(Math.max(1, limit), items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

export async function fetchMetaAccountsOverview(
  env: WorkerEnv,
  token: string,
  since: string,
  until: string,
  concurrency = 5
): Promise<{ rows: MetaAccountMetricsRow[]; range: { since: string; until: string }; error: string | null }> {
  const listed = await listMetaAdAccountsFromEnv(env, token)
  if (listed.error && listed.accounts.length === 0) {
    return { rows: [], range: { since, until }, error: listed.error }
  }

  const rows = await mapPool(listed.accounts, concurrency, async (acc) => {
    const { row, error } = await fetchMetaAccountInsights(token, acc.id, since, until)
    const metrics = rowToMetrics(row)
    return {
      id: acc.id,
      accountId: acc.account_id,
      name: acc.name,
      ...metrics,
      error,
    }
  })

  return { rows, range: { since, until }, error: listed.error }
}

export type MetaDailyRow = {
  date: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  reach: number
}

export async function fetchMetaAccountDaily(
  token: string,
  actId: string,
  since: string,
  until: string
): Promise<MetaDailyRow[]> {
  const fields = ['spend', 'impressions', 'reach', 'clicks', 'actions', 'date_start'].join(',')
  const iu = new URL(`https://graph.facebook.com/v21.0/${actId}/insights`)
  iu.searchParams.set('fields', fields)
  iu.searchParams.set('time_range', JSON.stringify({ since, until }))
  iu.searchParams.set('time_increment', '1')
  iu.searchParams.set('access_token', token)
  try {
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
  } catch {
    return []
  }
}

export async function fetchSingleMetaAccountMetrics(
  token: string,
  actId: string,
  name: string,
  accountId: string,
  since: string,
  until: string
): Promise<MetaAccountMetricsRow> {
  const { row, error } = await fetchMetaAccountInsights(token, actId, since, until)
  return {
    id: actId,
    accountId,
    name,
    ...rowToMetrics(row),
    error,
  }
}
