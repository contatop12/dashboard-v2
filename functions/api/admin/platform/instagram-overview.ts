import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json, jsonError } from '../../../_lib/json'
import {
  decryptMetaAccessToken,
  getActiveConnectionForOrg,
} from '../../../_lib/org-platform-credentials'
import {
  aggregateIgRawFromDaily,
  fetchIgDailyInsights,
  fetchIgPostsAndContent,
  fetchIgProfile,
  igDisplayName,
  parseIgRangeParams,
} from '../../../_lib/instagram-insights'
import {
  EMPTY_IG_MONTHLY_RESULTS,
  fetchIgMonthlyResults,
} from '../../../_lib/instagram-monthly'
import { resolveInstagramGraphToken } from '../../../_lib/meta-ig-token'
import { IG_REQUIRED_SCOPES, isIgPermissionError } from '../../../_lib/instagram-permissions'

function resolveIgUserId(url: URL, env: WorkerEnv): string | null {
  const fromQuery = url.searchParams.get('ig_user_id')?.trim()
  if (fromQuery) return fromQuery
  const configured = env.META_INSTAGRAM_USER_ID?.trim()
  return configured || null
}

async function buildInstagramResponse(
  userToken: string,
  igId: string,
  accountDisplay: string,
  source: 'worker_env' | 'oauth_org',
  since: string,
  until: string,
  compareSince: string | null,
  compareUntil: string | null,
  businessId?: string | null
): Promise<Record<string, unknown>> {
  const resolved = await resolveInstagramGraphToken(userToken, igId, businessId)
  const token = resolved.token

  const [profile, primaryPack, comparePack, postsPack, monthlyResults] = await Promise.all([
    fetchIgProfile(token, igId),
    fetchIgDailyInsights(token, igId, since, until),
    compareSince && compareUntil
      ? fetchIgDailyInsights(token, igId, compareSince, compareUntil)
      : Promise.resolve({ daily: [], error: null, permissionDenied: false, hasInsightData: false }),
    fetchIgPostsAndContent(token, igId, since, until),
    fetchIgMonthlyResults(token, igId, until),
  ])

  const followers = profile?.followers ?? 0
  const display = accountDisplay || igDisplayName(profile, igId)
  const hasInsightData = primaryPack.hasInsightData
  const igMetricsRaw = hasInsightData ? aggregateIgRawFromDaily(primaryPack.daily, followers) : null
  const igMetricsCompareRaw =
    compareSince && compareUntil && comparePack.hasInsightData
      ? aggregateIgRawFromDaily(comparePack.daily, followers)
      : null

  const permissionDenied = Boolean(
    primaryPack.permissionDenied ||
      (typeof postsPack.error === 'string' && isIgPermissionError(postsPack.error))
  )
  const errors = [primaryPack.error, postsPack.error, monthlyResults.error].filter(Boolean)
  const primaryError = errors[0] ?? null

  return {
    configured: true,
    source,
    accountDisplay: display,
    error: primaryError,
    permissionDenied,
    missingIgScopes: permissionDenied ? [...IG_REQUIRED_SCOPES] : [],
    tokenSource: resolved.source,
    linkedPage: resolved.pageName,
    detail: profile?.name ? `${profile.name} · Graph API` : 'Instagram · Graph API',
    primaryRange: { since, until },
    compareRange:
      compareSince && compareUntil ? { since: compareSince, until: compareUntil } : null,
    profile: profile
      ? {
          username: profile.username,
          followers: profile.followers,
          following: profile.following,
          mediaCount: profile.mediaCount,
        }
      : null,
    igMetricsRaw,
    igMetricsCompareRaw,
    daily: primaryPack.daily,
    compareDaily: comparePack.daily,
    monthlyResults: monthlyResults ?? EMPTY_IG_MONTHLY_RESULTS,
    contentTypes: postsPack.contentTypes,
    posts: postsPack.posts,
    postsError: postsPack.error,
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
  const { since, until, compareSince, compareUntil } = parseIgRangeParams(url)
  const orgId = url.searchParams.get('org_id')?.trim() || ''

  if (orgId) {
    if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
      return jsonError('Sem acesso a esta organização', 403)
    }
    const conn = await getActiveConnectionForOrg(context.env.DB, orgId, 'instagram')
    if (!conn) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: null,
        error: null,
        detail: 'Nenhuma conta Instagram ligada a esta organização.',
        primaryRange: { since, until },
        compareRange: null,
        igMetricsRaw: null,
        igMetricsCompareRaw: null,
        daily: [],
        compareDaily: [],
        monthlyResults: EMPTY_IG_MONTHLY_RESULTS,
        contentTypes: [],
        posts: [],
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
        primaryRange: { since, until },
        compareRange: null,
        igMetricsRaw: null,
        igMetricsCompareRaw: null,
        daily: [],
        compareDaily: [],
        monthlyResults: EMPTY_IG_MONTHLY_RESULTS,
        contentTypes: [],
        posts: [],
      })
    }
    const igId = conn.external_id.trim()
    const accountDisplay = conn.external_name?.trim() || ''
    try {
      const body = await buildInstagramResponse(
        token,
        igId,
        accountDisplay,
        'oauth_org',
        since,
        until,
        compareSince,
        compareUntil,
        context.env.META_BUSINESS_ID
      )
      return json(body)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro Instagram'
      return json({
        configured: true,
        source: 'oauth_org',
        accountDisplay: conn.external_name ?? `IG ${igId}`,
        error: msg,
        detail: null,
        primaryRange: { since, until },
        compareRange: null,
        igMetricsRaw: null,
        igMetricsCompareRaw: null,
        daily: [],
        compareDaily: [],
        monthlyResults: EMPTY_IG_MONTHLY_RESULTS,
        contentTypes: [],
        posts: [],
      })
    }
  }

  if (user.role !== 'super_admin') {
    return jsonError('org_id é obrigatório', 400)
  }

  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const token = context.env.META_ACCESS_TOKEN?.trim()
  const igId = resolveIgUserId(url, context.env)

  if (!token || !igId) {
    return json({
      configured: false,
      source: 'worker_env',
      accountDisplay: null,
      error: null,
      detail: 'Defina META_ACCESS_TOKEN e META_INSTAGRAM_USER_ID no Worker.',
      primaryRange: { since, until },
      compareRange: null,
      igMetricsRaw: null,
      igMetricsCompareRaw: null,
      daily: [],
      compareDaily: [],
      monthlyResults: EMPTY_IG_MONTHLY_RESULTS,
      contentTypes: [],
      posts: [],
    })
  }

  try {
    const body = await buildInstagramResponse(
      token,
      igId,
      '',
      'worker_env',
      since,
      until,
      compareSince,
      compareUntil,
      context.env.META_BUSINESS_ID
    )
    return json(body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro Instagram'
    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay: null,
      error: msg,
      detail: null,
      primaryRange: { since, until },
      compareRange: null,
      igMetricsRaw: null,
      igMetricsCompareRaw: null,
      daily: [],
      compareDaily: [],
      monthlyResults: EMPTY_IG_MONTHLY_RESULTS,
      contentTypes: [],
      posts: [],
    })
  }
}
