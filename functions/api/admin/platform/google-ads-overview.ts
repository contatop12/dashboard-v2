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

type Metric = { label: string; value: string }

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n)
}

function customerPathId(raw: string): string {
  return raw.trim().replace(/^customers\//, '').replace(/-/g, '')
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

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const url = new URL(context.request.url)
  const orgId = url.searchParams.get('org_id')?.trim() || ''

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
      })
    }
    const rawVer = env.GOOGLE_ADS_API_VERSION?.trim() || 'v17'
    const ver = rawVer.startsWith('v') ? rawVer : `v${rawVer}`
    const numericId = customerPathId(conn.external_id)
    const loginId = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim()

    const headers: Record<string, string> = {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
      'developer-token': devToken,
    }
    if (loginId) {
      headers['login-customer-id'] = customerPathId(loginId)
    }

    try {
      const accountDisplay =
        conn.external_name?.trim() ||
        (await fetchCustomerDescriptiveName(ver, numericId, headers)) ||
        `Cliente ${numericId}`

      const resBody = await aggregateCampaignsInternal(
        env,
        access,
        numericId,
        loginId,
        ver,
        accountDisplay,
        'oauth_org'
      )
      return resBody
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro Google Ads'
      return json({
        configured: true,
        source: 'oauth_org',
        accountDisplay: conn.external_name ?? `Cliente ${numericId}`,
        error: msg,
        detail: null,
        metrics: [] as Metric[],
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
    })
  }

  const rawVer = env.GOOGLE_ADS_API_VERSION?.trim() || 'v17'
  const ver = rawVer.startsWith('v') ? rawVer : `v${rawVer}`
  const numericId = customerPathId(cid)
  const loginId = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    'Content-Type': 'application/json',
    'developer-token': devToken,
  }
  if (loginId) {
    headers['login-customer-id'] = customerPathId(loginId)
  }

  try {
    const accountDisplay =
      (await fetchCustomerDescriptiveName(ver, numericId, headers)) || `Cliente ${numericId}`
    return await aggregateCampaignsInternal(
      env,
      access,
      numericId,
      loginId,
      ver,
      accountDisplay,
      'worker_env'
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro Google Ads'
    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay: `Cliente ${numericId}`,
      error: msg,
      detail: null,
      metrics: [] as Metric[],
    })
  }
}

async function aggregateCampaignsInternal(
  env: WorkerEnv,
  access: string,
  numericId: string,
  loginId: string | undefined,
  ver: string,
  accountDisplay: string,
  source: 'worker_env' | 'oauth_org'
): Promise<Response> {
  const url = `https://googleads.googleapis.com/${ver}/customers/${numericId}/googleAds:search`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    'Content-Type': 'application/json',
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim(),
  }
  if (loginId) {
    headers['login-customer-id'] = customerPathId(loginId)
  }

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
    AND campaign.status != 'REMOVED'
  `

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  })
  const body = (await res.json()) as {
    results?: {
      metrics?: {
        costMicros?: string
        impressions?: string
        clicks?: string
        conversions?: string | number
      }
    }[]
    error?: { message?: string; status?: string }
  }

  if (!res.ok || body.error) {
    return json({
      configured: true,
      source,
      accountDisplay,
      error: body.error?.message || `Google Ads API (${res.status})`,
      detail: `Cliente ${numericId}`,
      metrics: [] as Metric[],
    })
  }

  let costMicros = 0
  let impressions = 0
  let clicks = 0
  let conversions = 0

  for (const row of body.results ?? []) {
    const m = row.metrics
    if (!m) continue
    costMicros += Number.parseInt(String(m.costMicros ?? '0'), 10) || 0
    impressions += Number.parseInt(String(m.impressions ?? '0'), 10) || 0
    clicks += Number.parseInt(String(m.clicks ?? '0'), 10) || 0
    conversions += Number.parseFloat(String(m.conversions ?? '0')) || 0
  }

  const spend = costMicros / 1_000_000
  const ctrPct = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc = clicks > 0 ? spend / clicks : 0

  const metrics: Metric[] = [
    { label: 'Investimento (30d)', value: fmtBRL(spend) },
    { label: 'Impressões', value: fmtInt(impressions) },
    { label: 'Cliques', value: fmtInt(clicks) },
    { label: 'CTR médio', value: `${ctrPct.toFixed(2)}%` },
    { label: 'CPC médio', value: fmtBRL(cpc) },
    { label: 'Conversões', value: fmtInt(Math.round(conversions)) },
  ]

  return json({
    configured: true,
    source,
    accountDisplay,
    error: null,
    detail: `Cliente ${numericId} · campanhas · últimos 30 dias`,
    metrics,
  })
}
