import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { json, jsonError } from '../../../_lib/json'
import { getActiveConnectionForOrg, decryptMetaAccessToken } from '../../../_lib/org-platform-credentials'

export function normalizeStatus(raw: unknown): 'ACTIVE' | 'PAUSED' | null {
  const s = String(raw ?? '').trim().toUpperCase()
  return s === 'ACTIVE' || s === 'PAUSED' ? s : null
}

export function buildMetaStatusRequest(id: string, status: 'ACTIVE' | 'PAUSED', token: string) {
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(id)}`
  const body = new URLSearchParams({ status, access_token: token })
  return { url, body }
}

export async function onRequestPost(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  let payload: { orgId?: string; id?: string; status?: string; level?: string }
  try {
    payload = await context.request.json()
  } catch {
    return jsonError('Corpo inválido', 400)
  }

  const orgId = String(payload.orgId ?? '').trim()
  const id = String(payload.id ?? '').trim()
  const status = normalizeStatus(payload.status)
  if (!orgId || !id || !status) return jsonError('Parâmetros obrigatórios: orgId, id, status (ACTIVE|PAUSED)', 400)

  if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
    return jsonError('Sem acesso a esta organização', 403)
  }

  const conn = await getActiveConnectionForOrg(context.env.DB, orgId, 'meta_ads')
  if (!conn) return jsonError('Nenhuma conta Meta ligada a esta organização', 404)

  const token = await decryptMetaAccessToken(context.env.DB, context.env, conn.oauth_credential_id)
  if (!token) return jsonError('Token Meta indisponível. Reconecte em Integrações.', 409)

  const { url, body } = buildMetaStatusRequest(id, status, token)
  const res = await fetch(url, { method: 'POST', body })
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string } }

  if (!res.ok || data.error) {
    const msg = data.error?.message || `Graph API (${res.status})`
    // Token lacking ads_management surfaces here — message is passed to the UI for rollback.
    return jsonError(msg, 502)
  }

  return json({ ok: true, id, status })
}
