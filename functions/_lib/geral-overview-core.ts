import type { D1Database } from '@cloudflare/workers-types'
import type { WorkerEnv } from './worker-env'
import { getGoogleAccessTokenFromEnv } from './google-access-token'
import {
  decryptMetaAccessToken,
  getActiveConnectionForOrg,
  getValidGoogleAccessTokenFromCredential,
} from './org-platform-credentials'
import {
  fetchMetaAccountDaily,
  fetchMetaAccountsOverview,
  fetchSingleMetaAccountMetrics,
  listMetaAdAccountsFromEnv,
  type MetaAccountMetricsRow,
  type MetaDailyRow,
  defaultLast30Ymd,
  isYmd,
} from './meta-accounts-overview-core'
import {
  fetchGoogleAccountDaily,
  fetchGoogleAccountsOverview,
  fetchSingleGoogleAccountMetrics,
  type GoogleAccountMetricsRow,
  type GoogleDailyRow,
} from './google-accounts-overview-core'

const MAX_RANGE_DAYS = 366
const CONCURRENCY = 4

export type GeralTotals = {
  spend: number
  results: number
  conversionValue: number
  impressions: number
  clicks: number
  reach: number
  metaSpend: number
  googleSpend: number
  metaResults: number
  googleConversions: number
}

export type GeralDailyRow = {
  date: string
  spend: number
  results: number
  impressions: number
  clicks: number
  metaSpend: number
  googleSpend: number
  conversionValue: number
}

export type GeralChannelRow = {
  id: 'meta_ads' | 'google_ads'
  name: string
  spend: number
  results: number
}

export type GeralOverviewPayload = {
  configured: boolean
  source: 'worker_all' | 'org' | 'none'
  detail: string | null
  primaryRange: { since: string; until: string }
  compareRange: { since: string; until: string } | null
  totals: GeralTotals
  compareTotals: GeralTotals | null
  daily: GeralDailyRow[]
  compareDaily: GeralDailyRow[]
  channels: GeralChannelRow[]
  metaAccountCount: number
  googleAccountCount: number
  errors: { meta: string | null; google: string | null }
}

function emptyTotals(): GeralTotals {
  return {
    spend: 0,
    results: 0,
    conversionValue: 0,
    impressions: 0,
    clicks: 0,
    reach: 0,
    metaSpend: 0,
    googleSpend: 0,
    metaResults: 0,
    googleConversions: 0,
  }
}

export function parseGeralRangeParams(url: URL): {
  since: string
  until: string
  compareSince: string | null
  compareUntil: string | null
} {
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

function daysBetweenInclusive(since: string, until: string): number {
  const a = new Date(since + 'T12:00:00Z').getTime()
  const b = new Date(until + 'T12:00:00Z').getTime()
  return Math.floor((b - a) / (86400 * 1000)) + 1
}

function sumMetaRows(rows: MetaAccountMetricsRow[]): GeralTotals {
  const t = emptyTotals()
  for (const r of rows) {
    const results = r.metaResults > 0 ? r.metaResults : r.leads
    t.metaSpend += r.spend
    t.metaResults += results
    t.spend += r.spend
    t.results += results
    t.impressions += r.impressions
    t.clicks += r.linkClicks > 0 ? r.linkClicks : r.clicks
    t.reach += r.reach
  }
  return t
}

function sumGoogleRows(rows: GoogleAccountMetricsRow[]): GeralTotals {
  const t = emptyTotals()
  for (const r of rows) {
    t.googleSpend += r.spend
    t.googleConversions += r.conversions
    t.spend += r.spend
    t.results += r.conversions
    t.conversionValue += r.conversionsValue
    t.impressions += r.impressions
    t.clicks += r.clicks
  }
  return t
}

function mergeTotals(meta: GeralTotals, google: GeralTotals): GeralTotals {
  return {
    spend: meta.spend + google.spend,
    results: meta.results + google.results,
    conversionValue: meta.conversionValue + google.conversionValue,
    impressions: meta.impressions + google.impressions,
    clicks: meta.clicks + google.clicks,
    reach: meta.reach + google.reach,
    metaSpend: meta.metaSpend,
    googleSpend: google.googleSpend,
    metaResults: meta.metaResults,
    googleConversions: google.googleConversions,
  }
}

function mergeGeralDaily(metaDays: MetaDailyRow[], googleDays: GoogleDailyRow[]): GeralDailyRow[] {
  const map = new Map<string, GeralDailyRow>()
  for (const d of metaDays) {
    if (!d.date) continue
    const cur = map.get(d.date) ?? {
      date: d.date,
      spend: 0,
      results: 0,
      impressions: 0,
      clicks: 0,
      metaSpend: 0,
      googleSpend: 0,
      conversionValue: 0,
    }
    cur.spend += d.spend
    cur.metaSpend += d.spend
    cur.results += d.leads
    cur.impressions += d.impressions
    cur.clicks += d.clicks
    map.set(d.date, cur)
  }
  for (const d of googleDays) {
    if (!d.date) continue
    const cur = map.get(d.date) ?? {
      date: d.date,
      spend: 0,
      results: 0,
      impressions: 0,
      clicks: 0,
      metaSpend: 0,
      googleSpend: 0,
      conversionValue: 0,
    }
    cur.spend += d.spend
    cur.googleSpend += d.spend
    cur.results += d.conversions
    cur.impressions += d.impressions
    cur.clicks += d.clicks
    cur.conversionValue += d.conversionsValue
    map.set(d.date, cur)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function buildChannels(meta: GeralTotals, google: GeralTotals): GeralChannelRow[] {
  const channels: GeralChannelRow[] = []
  if (meta.metaSpend > 0 || meta.metaResults > 0 || meta.impressions > 0) {
    channels.push({
      id: 'meta_ads',
      name: 'Meta Ads',
      spend: meta.metaSpend,
      results: meta.metaResults,
    })
  }
  if (google.googleSpend > 0 || google.googleConversions > 0 || google.impressions > 0) {
    channels.push({
      id: 'google_ads',
      name: 'Google Ads',
      spend: google.googleSpend,
      results: google.googleConversions,
    })
  }
  return channels
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return []
  const results = new Array<R>(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++
      results[idx] = await fn(items[idx])
    }
  }
  const workers = Math.min(Math.max(1, limit), items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

function normalizeActId(raw: string): string {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return ''
  if (t.startsWith('act_')) return t
  return `act_${t}`
}

async function fetchPeriodWorkerAll(
  env: WorkerEnv,
  metaToken: string | null,
  googleAccess: string | null,
  since: string,
  until: string
): Promise<{
  metaRows: MetaAccountMetricsRow[]
  googleRows: GoogleAccountMetricsRow[]
  metaDaily: MetaDailyRow[]
  googleDaily: GoogleDailyRow[]
  metaError: string | null
  googleError: string | null
}> {
  const [metaPack, googlePack] = await Promise.all([
    metaToken
      ? (async () => {
          const overview = await fetchMetaAccountsOverview(env, metaToken, since, until, CONCURRENCY)
          const activeIds = new Set(
            overview.rows.filter((r) => r.spend > 0 || r.impressions > 0).map((r) => r.id)
          )
          const listed = await listMetaAdAccountsFromEnv(env, metaToken)
          const accounts = listed.accounts.filter((a) => activeIds.has(a.id))
          const dailyChunks = await mapPool(accounts, CONCURRENCY, (acc) =>
            fetchMetaAccountDaily(metaToken, acc.id, since, until)
          )
          return {
            rows: overview.rows,
            daily: dailyChunks.flat(),
            error: overview.error,
          }
        })()
      : Promise.resolve({ rows: [] as MetaAccountMetricsRow[], daily: [] as MetaDailyRow[], error: null }),
    googleAccess
      ? (async () => {
          const overview = await fetchGoogleAccountsOverview(env, googleAccess, since, until, CONCURRENCY)
          const activeRows = overview.rows.filter((r) => r.spend > 0 || r.impressions > 0)
          const dailyChunks = await mapPool(activeRows, CONCURRENCY, (row) =>
            fetchGoogleAccountDaily(env, googleAccess, row.id, since, until)
          )
          return {
            rows: overview.rows,
            daily: dailyChunks.flat(),
            error: overview.error,
          }
        })()
      : Promise.resolve({ rows: [] as GoogleAccountMetricsRow[], daily: [] as GoogleDailyRow[], error: null }),
  ])

  return {
    metaRows: metaPack.rows,
    googleRows: googlePack.rows,
    metaDaily: metaPack.daily,
    googleDaily: googlePack.daily,
    metaError: metaPack.error,
    googleError: googlePack.error,
  }
}

async function fetchPeriodOrg(
  env: WorkerEnv,
  db: D1Database,
  orgId: string,
  since: string,
  until: string
): Promise<{
  metaRows: MetaAccountMetricsRow[]
  googleRows: GoogleAccountMetricsRow[]
  metaDaily: MetaDailyRow[]
  googleDaily: GoogleDailyRow[]
  metaError: string | null
  googleError: string | null
}> {
  const metaConn = await getActiveConnectionForOrg(db, orgId, 'meta_ads')
  const googleConn = await getActiveConnectionForOrg(db, orgId, 'google_ads')

  let metaRows: MetaAccountMetricsRow[] = []
  let googleRows: GoogleAccountMetricsRow[] = []
  let metaDaily: MetaDailyRow[] = []
  let googleDaily: GoogleDailyRow[] = []
  let metaError: string | null = null
  let googleError: string | null = null

  if (metaConn) {
    const useWorkerSecrets = !metaConn.oauth_credential_id
    const token = useWorkerSecrets
      ? env.META_ACCESS_TOKEN?.trim() ?? null
      : await decryptMetaAccessToken(db, env, metaConn.oauth_credential_id)
    if (!token) {
      metaError = useWorkerSecrets ? 'META_ACCESS_TOKEN não configurado.' : 'Token Meta indisponível.'
    } else {
      const actId = normalizeActId(metaConn.external_id)
      const row = await fetchSingleMetaAccountMetrics(
        token,
        actId,
        metaConn.external_name ?? actId,
        metaConn.external_id,
        since,
        until
      )
      metaRows = [row]
      metaError = row.error
      metaDaily = await fetchMetaAccountDaily(token, actId, since, until)
    }
  }

  if (googleConn) {
    const useWorkerSecrets = !googleConn.oauth_credential_id
    const access = useWorkerSecrets
      ? await getGoogleAccessTokenFromEnv(env)
      : await getValidGoogleAccessTokenFromCredential(db, env, googleConn.oauth_credential_id)
    if (!access) {
      googleError = useWorkerSecrets
        ? 'GOOGLE_ADS_REFRESH_TOKEN não configurado.'
        : 'Token Google indisponível.'
    } else {
      const row = await fetchSingleGoogleAccountMetrics(
        env,
        access,
        googleConn.external_id,
        googleConn.external_name ?? googleConn.external_id,
        since,
        until
      )
      googleRows = [row]
      googleError = row.error
      googleDaily = await fetchGoogleAccountDaily(env, access, googleConn.external_id, since, until)
    }
  }

  return { metaRows, googleRows, metaDaily, googleDaily, metaError, googleError }
}

function packFromPeriod(
  metaRows: MetaAccountMetricsRow[],
  googleRows: GoogleAccountMetricsRow[],
  metaDaily: MetaDailyRow[],
  googleDaily: GoogleDailyRow[]
): {
  totals: GeralTotals
  daily: GeralDailyRow[]
  channels: GeralChannelRow[]
} {
  const metaTotals = sumMetaRows(metaRows)
  const googleTotals = sumGoogleRows(googleRows)
  return {
    totals: mergeTotals(metaTotals, googleTotals),
    daily: mergeGeralDaily(metaDaily, googleDaily),
    channels: buildChannels(metaTotals, googleTotals),
  }
}

export async function buildGeralOverview(
  env: WorkerEnv,
  db: D1Database,
  url: URL,
  orgId: string | null,
  isSuperAdmin: boolean
): Promise<GeralOverviewPayload> {
  const { since, until, compareSince, compareUntil } = parseGeralRangeParams(url)
  const compareRange =
    compareSince && compareUntil ? { since: compareSince, until: compareUntil } : null

  const empty: GeralOverviewPayload = {
    configured: false,
    source: 'none',
    detail: 'Nenhuma conta Meta ou Google configurada para este contexto.',
    primaryRange: { since, until },
    compareRange,
    totals: emptyTotals(),
    compareTotals: null,
    daily: [],
    compareDaily: [],
    channels: [],
    metaAccountCount: 0,
    googleAccountCount: 0,
    errors: { meta: null, google: null },
  }

  if (orgId) {
    const primary = await fetchPeriodOrg(env, db, orgId, since, until)
    const hasData =
      primary.metaRows.length > 0 ||
      primary.googleRows.length > 0 ||
      primary.metaDaily.length > 0 ||
      primary.googleDaily.length > 0
    if (!hasData && !primary.metaError && !primary.googleError) {
      return { ...empty, detail: 'Conecte Meta Ads e/ou Google Ads em Integrações para esta organização.' }
    }
    const packed = packFromPeriod(
      primary.metaRows,
      primary.googleRows,
      primary.metaDaily,
      primary.googleDaily
    )
    let compareTotals: GeralTotals | null = null
    let compareDaily: GeralDailyRow[] = []
    if (compareRange) {
      const cmp = await fetchPeriodOrg(env, db, orgId, compareRange.since, compareRange.until)
      const cmpPacked = packFromPeriod(cmp.metaRows, cmp.googleRows, cmp.metaDaily, cmp.googleDaily)
      compareTotals = cmpPacked.totals
      compareDaily = cmpPacked.daily
    }
    return {
      configured: true,
      source: 'org',
      detail: null,
      primaryRange: { since, until },
      compareRange,
      totals: packed.totals,
      compareTotals,
      daily: packed.daily,
      compareDaily,
      channels: packed.channels,
      metaAccountCount: primary.metaRows.length,
      googleAccountCount: primary.googleRows.length,
      errors: { meta: primary.metaError, google: primary.googleError },
    }
  }

  if (!isSuperAdmin) {
    return { ...empty, detail: 'Selecione uma organização ou use como super administrador.' }
  }

  const metaToken = env.META_ACCESS_TOKEN?.trim() ?? null
  const googleAccess = await getGoogleAccessTokenFromEnv(env)
  if (!metaToken && !googleAccess) {
    return {
      ...empty,
      detail: 'Configure META_ACCESS_TOKEN e/ou GOOGLE_ADS_REFRESH_TOKEN no Worker.',
    }
  }

  const primary = await fetchPeriodWorkerAll(env, metaToken, googleAccess, since, until)
  const packed = packFromPeriod(
    primary.metaRows,
    primary.googleRows,
    primary.metaDaily,
    primary.googleDaily
  )
  let compareTotals: GeralTotals | null = null
  let compareDaily: GeralDailyRow[] = []
  if (compareRange) {
    const cmp = await fetchPeriodWorkerAll(env, metaToken, googleAccess, compareRange.since, compareRange.until)
    const cmpPacked = packFromPeriod(cmp.metaRows, cmp.googleRows, cmp.metaDaily, cmp.googleDaily)
    compareTotals = cmpPacked.totals
    compareDaily = cmpPacked.daily
  }

  return {
    configured: packed.totals.spend > 0 || packed.totals.impressions > 0 || primary.metaRows.length > 0 || primary.googleRows.length > 0,
    source: 'worker_all',
    detail: null,
    primaryRange: { since, until },
    compareRange,
    totals: packed.totals,
    compareTotals,
    daily: packed.daily,
    compareDaily,
    channels: packed.channels,
    metaAccountCount: primary.metaRows.length,
    googleAccountCount: primary.googleRows.length,
    errors: { meta: primary.metaError, google: primary.googleError },
  }
}
