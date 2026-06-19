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
import type { HttpGet } from '../../../_lib/google-business-performance'
import { buildBusinessOverviewSections } from '../../../_lib/google-business-overview-core'

function normalizeGmbAccountKey(raw: string): string {
  return raw.trim().replace(/^accounts\//, '')
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function defaultLast30(): { since: string; until: string } {
  const u = new Date()
  // Performance API tem atraso ~3 dias; encerra a janela 3 dias atrás.
  u.setUTCDate(u.getUTCDate() - 3)
  const until = u.toISOString().slice(0, 10)
  const s = new Date(u)
  s.setUTCDate(s.getUTCDate() - 29)
  return { since: s.toISOString().slice(0, 10), until }
}

function parseRange(url: URL): { since: string; until: string; compareSince: string | null; compareUntil: string | null } {
  const ds = url.searchParams.get('since')?.trim() ?? ''
  const du = url.searchParams.get('until')?.trim() ?? ''
  let since = isYmd(ds) ? ds : ''
  let until = isYmd(du) ? du : ''
  if (!since || !until) {
    const d = defaultLast30()
    since = d.since
    until = d.until
  }
  const cs = url.searchParams.get('compare_since')?.trim() ?? ''
  const ct = url.searchParams.get('compare_until')?.trim() ?? ''
  return {
    since,
    until,
    compareSince: isYmd(cs) ? cs : null,
    compareUntil: isYmd(ct) ? ct : null,
  }
}

function emptySections() {
  return {
    locations: [],
    selectedLocationId: null,
    metrics: [],
    compareMetrics: null,
    daily: [],
    searchKeywords: { items: [], monthsCovered: null, error: null },
    reviews: { items: [], averageRating: null, totalCount: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }, error: null },
    byLocation: { items: [], error: null },
  }
}

function makeHttpGet(access: string): HttpGet {
  return async (url: string) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${access}` } })
    const j = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, json: j }
  }
}

async function pickAccountId(
  httpGet: HttpGet,
  preferredExternalId: string | null
): Promise<{ accountId: string | null; accountDisplay: string | null; error: string | null }> {
  const res = await httpGet('https://mybusinessaccountmanagement.googleapis.com/v1/accounts')
  if (!res.ok) {
    const j = res.json as { error?: { message?: string } }
    return { accountId: null, accountDisplay: null, error: j?.error?.message || `Account API (${res.status})` }
  }
  const body = res.json as { accounts?: { name?: string; accountName?: string }[] }
  let accounts = body.accounts ?? []
  if (preferredExternalId?.trim()) {
    const want = normalizeGmbAccountKey(preferredExternalId)
    const filtered = accounts.filter((a) => normalizeGmbAccountKey(a.name ?? '') === want || (a.name ?? '').includes(want))
    if (filtered.length) accounts = filtered
  }
  const primary = accounts[0]
  if (!primary) return { accountId: null, accountDisplay: null, error: 'Nenhuma conta Google Business encontrada.' }
  return {
    accountId: normalizeGmbAccountKey(primary.name ?? ''),
    accountDisplay: primary.accountName?.trim() || normalizeGmbAccountKey(primary.name ?? '') || null,
    error: null,
  }
}

async function buildBody(
  access: string,
  source: 'worker_env' | 'oauth_org' | 'assigned_env',
  preferredExternalId: string | null,
  fallbackDisplay: string | null,
  locationId: string | null,
  range: ReturnType<typeof parseRange>
): Promise<Record<string, unknown>> {
  const httpGet = makeHttpGet(access)
  const acc = await pickAccountId(httpGet, preferredExternalId)
  if (!acc.accountId) {
    return {
      configured: true,
      source,
      accountDisplay: fallbackDisplay,
      error: acc.error,
      detail: null,
      primaryRange: { since: range.since, until: range.until },
      compareRange: null,
      ...emptySections(),
    }
  }

  const sections = await buildBusinessOverviewSections(httpGet, acc.accountId, {
    locationId,
    since: range.since,
    until: range.until,
    compareSince: range.compareSince,
    compareUntil: range.compareUntil,
  })

  return {
    configured: true,
    source,
    accountDisplay: acc.accountDisplay || fallbackDisplay,
    error: null,
    detail: `Conta ${acc.accountId} · ${range.since} → ${range.until}`,
    primaryRange: { since: range.since, until: range.until },
    compareRange:
      range.compareSince && range.compareUntil
        ? { since: range.compareSince, until: range.compareUntil }
        : null,
    ...sections,
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
  const locationId = url.searchParams.get('location_id')?.trim() || null
  const range = parseRange(url)

  if (orgId) {
    if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
      return jsonError('Sem acesso a esta organização', 403)
    }
    const conn = await getActiveConnectionForOrg(context.env.DB, orgId, 'google_business')
    if (!conn) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: null,
        error: null,
        detail: 'Nenhuma conta Google Meu Negócio ligada a esta organização.',
        primaryRange: { since: range.since, until: range.until },
        compareRange: null,
        ...emptySections(),
      })
    }
    const access = await getValidGoogleAccessTokenFromCredential(
      context.env.DB,
      context.env,
      conn.oauth_credential_id
    )
    if (!access) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: conn.external_name,
        error: null,
        detail: 'Token Google indisponível. Reconecte em Integrações.',
        primaryRange: { since: range.since, until: range.until },
        compareRange: null,
        ...emptySections(),
      })
    }
    try {
      const body = await buildBody(
        access,
        'oauth_org',
        conn.external_id,
        conn.external_name?.trim() || null,
        locationId,
        range
      )
      return json(body)
    } catch (e) {
      return json({
        configured: true,
        source: 'oauth_org',
        accountDisplay: conn.external_name ?? null,
        error: e instanceof Error ? e.message : 'Erro Google Business',
        detail: null,
        primaryRange: { since: range.since, until: range.until },
        compareRange: null,
        ...emptySections(),
      })
    }
  }

  if (user.role !== 'super_admin') {
    return jsonError('org_id é obrigatório', 400)
  }
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const access = await getGoogleAccessTokenFromEnv(context.env)
  if (!access) {
    return json({
      configured: false,
      source: 'worker_env',
      accountDisplay: null,
      error: null,
      detail: 'Defina GOOGLE_ADS_REFRESH_TOKEN (escopo business.manage) + CLIENT_ID/SECRET no Worker.',
      primaryRange: { since: range.since, until: range.until },
      compareRange: null,
      ...emptySections(),
    })
  }

  const preferredGmbAccountId = url.searchParams.get('gmb_account_id')?.trim() || null

  try {
    const body = await buildBody(access, 'worker_env', preferredGmbAccountId, null, locationId, range)
    return json(body)
  } catch (e) {
    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay: null,
      error: e instanceof Error ? e.message : 'Erro Google Business',
      detail: null,
      primaryRange: { since: range.since, until: range.until },
      compareRange: null,
      ...emptySections(),
    })
  }
}
