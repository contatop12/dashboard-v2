import type { WorkerEnv } from '../../../../_lib/worker-env'
import type { UserRow } from '../../../../_lib/auth'
import { requireSuperAdmin } from '../../../../_lib/admin-guard'
import { json, jsonError } from '../../../../_lib/json'

const ASSIGNABLE = ['meta_ads', 'google_ads', 'google_business'] as const
type AssignableProvider = (typeof ASSIGNABLE)[number]

type AssignmentItem = { external_id: string; external_name?: string | null }

export async function onRequestGet(context: {
  env: WorkerEnv
  data: { user?: UserRow | null }
  params: { id: string }
}): Promise<Response> {
  const user = context.data.user
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const orgId = context.params.id
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

export async function onRequestPut(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
  params: { id: string }
}): Promise<Response> {
  const user = context.data.user
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const orgId = context.params.id
  const org = await context.env.DB.prepare(`SELECT id FROM organizations WHERE id = ? LIMIT 1`)
    .bind(orgId)
    .first<{ id: string }>()
  if (!org) return jsonError('Organização não encontrada', 404)

  let body: Partial<Record<AssignableProvider, AssignmentItem[]>>
  try {
    body = await context.request.json()
  } catch {
    return jsonError('JSON inválido', 400)
  }

  const db = context.env.DB

  for (const provider of ASSIGNABLE) {
    if (!(provider in body)) continue
    const list = body[provider]
    if (!Array.isArray(list)) {
      return jsonError(`${provider} deve ser um array`, 400)
    }

    await db
      .prepare(
        `DELETE FROM connected_accounts
         WHERE org_id = ? AND provider = ? AND oauth_credential_id IS NULL`
      )
      .bind(orgId, provider)
      .run()

    const insertedIds: string[] = []
    for (const item of list) {
      const externalId = String(item?.external_id ?? '').trim()
      if (!externalId) continue
      const externalName = item.external_name?.trim() || null
      await db
        .prepare(
          `INSERT INTO connected_accounts (id, org_id, provider, external_id, external_name, status, oauth_credential_id)
           VALUES (?, ?, ?, ?, ?, 'active', NULL)`
        )
        .bind(crypto.randomUUID(), orgId, provider, externalId, externalName)
        .run()
      insertedIds.push(externalId)
    }

    const sel = await db
      .prepare(`SELECT external_id FROM org_account_selections WHERE org_id = ? AND provider = ?`)
      .bind(orgId, provider)
      .first<{ external_id: string }>()

    const selId = sel?.external_id?.trim()
    const selStillValid = selId && insertedIds.includes(selId)
    if (!selStillValid && insertedIds.length > 0) {
      await db
        .prepare(
          `INSERT INTO org_account_selections (org_id, provider, external_id, updated_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(org_id, provider) DO UPDATE SET
             external_id = excluded.external_id,
             updated_at = excluded.updated_at`
        )
        .bind(orgId, provider, insertedIds[0])
        .run()
    } else if (insertedIds.length === 0 && selId) {
      await db
        .prepare(`DELETE FROM org_account_selections WHERE org_id = ? AND provider = ?`)
        .bind(orgId, provider)
        .run()
    }
  }

  const { results } = await db
    .prepare(
      `SELECT id, org_id, provider, external_id, external_name, status, oauth_credential_id, created_at
       FROM connected_accounts WHERE org_id = ? ORDER BY provider, COALESCE(external_name, external_id)`
    )
    .bind(orgId)
    .all()

  return json({ ok: true, connections: results ?? [] })
}
