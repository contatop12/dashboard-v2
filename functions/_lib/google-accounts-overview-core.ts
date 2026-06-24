import type { WorkerEnv } from './worker-env'
import {
  customerPathId,
  listGoogleAdsAccountsFromEnv,
  readGoogleAdsJson,
  resolveGoogleApiVersion,
  resolveGoogleLoginCustomerId,
  type GoogleAdsAccountEntry,
} from './google-ads-env'
import {
  defaultLast30Ymd,
  isYmd,
  parseAccountsOverviewRange,
  yesterdayYmd,
} from './meta-accounts-overview-core'

export { defaultLast30Ymd, isYmd, parseAccountsOverviewRange, yesterdayYmd }

export type GoogleAccountMetricsRow = {
  id: string
  name: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  conversionsValue: number
  ctr: number
  cpc: number
  costPerConversion: number | null
  conversionRate: number
  error: string | null
}

function metricsFromGaql(metrics: Record<string, unknown> | undefined): Omit<
  GoogleAccountMetricsRow,
  'id' | 'name' | 'error'
> {
  const m = metrics ?? {}
  const costMicros = Number.parseInt(String(m.costMicros ?? '0'), 10) || 0
  const impressions = Number.parseInt(String(m.impressions ?? '0'), 10) || 0
  const clicks = Number.parseInt(String(m.clicks ?? '0'), 10) || 0
  const conversions = Number.parseFloat(String(m.conversions ?? '0')) || 0
  const conversionsValue = Number.parseFloat(String(m.conversionsValue ?? m.conversions_value ?? '0')) || 0
  const spend = costMicros / 1_000_000
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc = clicks > 0 ? spend / clicks : 0
  const costPerConversion = conversions > 0 ? spend / conversions : null
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0
  return {
    spend,
    impressions,
    clicks,
    conversions,
    conversionsValue,
    ctr,
    cpc,
    costPerConversion,
    conversionRate,
  }
}

async function fetchGoogleCustomerMetrics(
  accessToken: string,
  developerToken: string,
  apiVersion: string,
  customerId: string,
  loginCustomerId: string | undefined,
  since: string,
  until: string
): Promise<{ metrics: ReturnType<typeof metricsFromGaql>; error: string | null }> {
  const ver = apiVersion.startsWith('v') ? apiVersion : `v${apiVersion}`
  const id = customerPathId(customerId)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'developer-token': developerToken,
  }
  if (loginCustomerId && customerPathId(loginCustomerId) !== id) {
    headers['login-customer-id'] = customerPathId(loginCustomerId)
  }

  const query = `
    SELECT
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${since}' AND '${until}'
  `

  try {
    const res = await fetch(`https://googleads.googleapis.com/${ver}/customers/${id}/googleAds:search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    })
    const parsed = await readGoogleAdsJson(res)
    if (!parsed.ok || !res.ok) {
      const err = (parsed.data.error as { message?: string } | undefined)?.message
      return { metrics: metricsFromGaql(undefined), error: err || `Google Ads API HTTP ${res.status}` }
    }
    const data = parsed.data as { results?: Array<{ metrics?: Record<string, unknown> }> }
    const agg = {
      costMicros: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionsValue: 0,
    }
    for (const row of data.results ?? []) {
      const m = row.metrics ?? {}
      agg.costMicros += Number.parseInt(String(m.costMicros ?? '0'), 10) || 0
      agg.impressions += Number.parseInt(String(m.impressions ?? '0'), 10) || 0
      agg.clicks += Number.parseInt(String(m.clicks ?? '0'), 10) || 0
      agg.conversions += Number.parseFloat(String(m.conversions ?? '0')) || 0
      agg.conversionsValue += Number.parseFloat(String(m.conversionsValue ?? m.conversions_value ?? '0')) || 0
    }
    return { metrics: metricsFromGaql(agg), error: null }
  } catch (e) {
    return {
      metrics: metricsFromGaql(undefined),
      error: e instanceof Error ? e.message : 'Erro ao buscar métricas Google',
    }
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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

function leafAccounts(accounts: GoogleAdsAccountEntry[]): GoogleAdsAccountEntry[] {
  return accounts.filter((a) => !a.isManager)
}

export async function fetchGoogleAccountsOverview(
  env: WorkerEnv,
  accessToken: string,
  since: string,
  until: string,
  concurrency = 5
): Promise<{ rows: GoogleAccountMetricsRow[]; range: { since: string; until: string }; error: string | null }> {
  const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  if (!devToken) {
    return { rows: [], range: { since, until }, error: 'GOOGLE_ADS_DEVELOPER_TOKEN não configurado no Worker.' }
  }

  const ver = resolveGoogleApiVersion(env)
  const loginId = resolveGoogleLoginCustomerId(env)
  const listed = await listGoogleAdsAccountsFromEnv(env, accessToken, { nameLimit: 300 })
  if (listed.error && listed.accounts.length === 0) {
    return { rows: [], range: { since, until }, error: listed.error }
  }

  const accounts = leafAccounts(listed.accounts)
  const rows = await mapPool(accounts, concurrency, async (acc) => {
    const { metrics, error } = await fetchGoogleCustomerMetrics(
      accessToken,
      devToken,
      ver,
      acc.id,
      loginId,
      since,
      until
    )
    return {
      id: acc.id,
      name: acc.name,
      ...metrics,
      error,
    }
  })

  return { rows, range: { since, until }, error: listed.error }
}
