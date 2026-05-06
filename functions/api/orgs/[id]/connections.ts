import type { D1Database } from '@cloudflare/workers-types'
import { json, jsonError } from '../../../_lib/json'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'

interface Env {
  DB: D1Database
}

export async function onRequestGet(context: {
  env: Env
  data: { user?: UserRow | null }
  params: { id: string }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const orgId = context.params.id
  if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
    return jsonError('Sem acesso a esta organização', 403)
  }

  const { results } = await context.env.DB.prepare(
    `SELECT id, org_id, provider, external_id, external_name, status, oauth_credential_id, created_at
     FROM connected_accounts
     WHERE org_id = ?
     ORDER BY provider, COALESCE(external_name, external_id)`
  )
    .bind(orgId)
    .all()

  return json({ connections: results ?? [] })
}
