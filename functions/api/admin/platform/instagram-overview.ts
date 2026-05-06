import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json, jsonError } from '../../../_lib/json'
import {
  decryptMetaAccessToken,
  getActiveConnectionForOrg,
} from '../../../_lib/org-platform-credentials'

type Metric = { label: string; value: string }

function fmtInt(n: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n)
}

async function instagramPayload(
  token: string,
  igId: string,
  accountDisplay: string,
  source: 'worker_env' | 'oauth_org'
): Promise<Record<string, unknown>> {
  const profUrl = new URL(`https://graph.facebook.com/v21.0/${igId}`)
  profUrl.searchParams.set('fields', 'username,followers_count,follows_count,media_count,name')
  profUrl.searchParams.set('access_token', token)

  const pr = await fetch(profUrl.toString())
  const prof = (await pr.json()) as {
    username?: string
    followers_count?: number
    follows_count?: number
    media_count?: number
    name?: string
    error?: { message?: string }
  }

  if (!pr.ok || prof.error) {
    return {
      configured: true,
      source,
      accountDisplay: `IG ${igId}`,
      error: prof.error?.message || 'Perfil Instagram inválido',
      detail: `IG ${igId}`,
      metrics: [] as Metric[],
    }
  }

  const display =
    accountDisplay ||
    (prof.username?.trim() ? `@${prof.username.trim()}` : prof.name?.trim() || `IG ${igId}`)

  const metrics: Metric[] = [
    { label: 'Usuário', value: `@${prof.username ?? '—'}` },
    { label: 'Seguidores', value: fmtInt(prof.followers_count ?? 0) },
    { label: 'Seguindo', value: fmtInt(prof.follows_count ?? 0) },
    { label: 'Mídias', value: fmtInt(prof.media_count ?? 0) },
  ]

  const insUrl = new URL(`https://graph.facebook.com/v21.0/${igId}/insights`)
  insUrl.searchParams.set('metric', 'impressions,reach')
  insUrl.searchParams.set('period', 'days_28')
  insUrl.searchParams.set('access_token', token)

  const ir = await fetch(insUrl.toString())
  const ins = (await ir.json()) as {
    data?: { name?: string; values?: { value?: number }[] }[]
    error?: { message?: string }
  }

  if (ir.ok && !ins.error && ins.data?.length) {
    for (const row of ins.data) {
      const v = row.values?.[0]?.value
      if (row.name === 'impressions' && v != null) {
        metrics.push({ label: 'Impressões (28d)', value: fmtInt(v) })
      }
      if (row.name === 'reach' && v != null) {
        metrics.push({ label: 'Alcance (28d)', value: fmtInt(v) })
      }
    }
  }

  return {
    configured: true,
    source,
    accountDisplay: display,
    error: ins.error && !ins.data?.length ? ins.error.message : null,
    detail: `${prof.name ?? 'Instagram'} · Graph API`,
    metrics,
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
        metrics: [] as Metric[],
      })
    }
    const token = await decryptMetaAccessToken(context.env.DB, context.env, conn.oauth_credential_id)
    if (!token) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: conn.external_name,
        error: null,
        detail: 'Token Meta indisponível. Reconecte em Conexões.',
        metrics: [] as Metric[],
      })
    }
    const igId = conn.external_id.trim()
    const accountDisplay = conn.external_name?.trim() || ''
    try {
      const body = await instagramPayload(token, igId, accountDisplay, 'oauth_org')
      return json(body)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro Instagram'
      return json({
        configured: true,
        source: 'oauth_org',
        accountDisplay: conn.external_name ?? `IG ${igId}`,
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

  const token = context.env.META_ACCESS_TOKEN?.trim()
  const igId = context.env.META_INSTAGRAM_USER_ID?.trim()

  if (!token || !igId) {
    return json({
      configured: false,
      source: 'worker_env',
      accountDisplay: null,
      error: null,
      detail: 'Defina META_ACCESS_TOKEN e META_INSTAGRAM_USER_ID no Worker.',
      metrics: [] as Metric[],
    })
  }

  try {
    const body = await instagramPayload(token, igId, '', 'worker_env')
    return json(body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro Instagram'
    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay: null,
      error: msg,
      detail: null,
      metrics: [] as Metric[],
    })
  }
}
