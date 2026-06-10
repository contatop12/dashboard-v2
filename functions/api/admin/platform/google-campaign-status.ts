import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { json, jsonError } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'
import {
  customerPathId,
  resolveGoogleApiVersion,
  resolveGoogleLoginCustomerId,
} from '../../../_lib/google-ads-env'
import {
  getActiveConnectionForOrg,
  getValidGoogleAccessTokenFromCredential,
} from '../../../_lib/org-platform-credentials'

export function normalizeGoogleMutateStatus(raw: unknown): 'ENABLED' | 'PAUSED' | null {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'ACTIVE' || s === 'ENABLED') return 'ENABLED'
  if (s === 'PAUSED') return 'PAUSED'
  return null
}

type MutateBody = {
  operations: { update: { resourceName: string; status: string }; updateMask: 'status' }[]
}

const LEVEL_RESOURCE: Record<string, string> = {
  campaign: 'campaigns',
  adset: 'adGroups',
  ad: 'adGroupAds',
}

export function buildGoogleMutateRequest(
  ver: string,
  customerId: string,
  level: string,
  id: string,
  status: 'ENABLED' | 'PAUSED'
): { url: string; body: MutateBody } | null {
  const resource = LEVEL_RESOURCE[level]
  if (!resource) return null
  const idOk = level === 'ad' ? /^\d+~\d+$/.test(id) : /^\d+$/.test(id)
  if (!idOk || !/^\d+$/.test(customerId)) return null
  return {
    url: `https://googleads.googleapis.com/${ver}/customers/${customerId}/${resource}:mutate`,
    body: {
      operations: [
        {
          update: { resourceName: `customers/${customerId}/${resource}/${id}`, status },
          updateMask: 'status',
        },
      ],
    },
  }
}

export async function onRequestPost(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  let payload: { orgId?: string; customerId?: string; id?: string; status?: string; level?: string }
  try {
    payload = await context.request.json()
  } catch {
    return jsonError('Corpo inválido', 400)
  }

  const orgId = String(payload.orgId ?? '').trim()
  const id = String(payload.id ?? '').trim()
  const level = String(payload.level ?? 'campaign').trim()
  const status = normalizeGoogleMutateStatus(payload.status)
  if (!id || !status) {
    return jsonError('Parâmetros obrigatórios: id, status (ACTIVE|PAUSED)', 400)
  }

  const env = context.env
  const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  if (!devToken) return jsonError('GOOGLE_ADS_DEVELOPER_TOKEN não configurado', 409)

  let access: string | null = null
  let customerId = ''

  if (orgId) {
    if (!(await userCanAccessOrg(env.DB, user, orgId))) {
      return jsonError('Sem acesso a esta organização', 403)
    }
    const conn = await getActiveConnectionForOrg(env.DB, orgId, 'google_ads')
    if (!conn) return jsonError('Nenhuma conta Google Ads ligada a esta organização', 404)
    customerId = customerPathId(conn.external_id)
    access = conn.oauth_credential_id
      ? await getValidGoogleAccessTokenFromCredential(env.DB, env, conn.oauth_credential_id)
      : await getGoogleAccessTokenFromEnv(env)
  } else {
    if (user.role !== 'super_admin') return jsonError('orgId é obrigatório', 400)
    const cid = String(payload.customerId ?? '').trim() || env.GOOGLE_ADS_CUSTOMER_ID?.trim() || ''
    if (!cid) return jsonError('customerId é obrigatório no modo secrets', 400)
    customerId = customerPathId(cid)
    access = await getGoogleAccessTokenFromEnv(env)
  }

  if (!access) return jsonError('Token Google indisponível. Reconecte em Integrações.', 409)

  const ver = resolveGoogleApiVersion(env)
  const req = buildGoogleMutateRequest(ver, customerId, level, id, status)
  if (!req) return jsonError('Nível ou id inválido', 400)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    'Content-Type': 'application/json',
    'developer-token': devToken,
  }
  const loginId = resolveGoogleLoginCustomerId(env)
  if (loginId) headers['login-customer-id'] = loginId

  const res = await fetch(req.url, { method: 'POST', headers, body: JSON.stringify(req.body) })
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
  if (!res.ok || data.error) {
    // Mensagem da API vai pro front — UI faz rollback do switch e exibe o motivo.
    return jsonError(data.error?.message || `Google Ads API (${res.status})`, 502)
  }
  return json({ ok: true, id, status })
}
