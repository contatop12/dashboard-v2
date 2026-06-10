import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json, jsonError } from '../../../_lib/json'

export async function onRequestDelete(context: {
  env: WorkerEnv
  data: { user?: UserRow | null }
  params: { id: string }
}): Promise<Response> {
  const user = context.data.user
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const orgId = context.params.id?.trim()
  if (!orgId) return jsonError('ID da organização obrigatório', 400)

  const org = await context.env.DB.prepare(
    `SELECT id, name, owner_user_id FROM organizations WHERE id = ? LIMIT 1`
  )
    .bind(orgId)
    .first<{ id: string; name: string; owner_user_id: string | null }>()
  if (!org) return jsonError('Organização não encontrada', 404)

  await context.env.DB.prepare(`DELETE FROM organizations WHERE id = ?`).bind(orgId).run()

  let deletedUserId: string | null = null
  if (org.owner_user_id) {
    const owner = await context.env.DB.prepare(
      `SELECT id, role FROM users WHERE id = ? LIMIT 1`
    )
      .bind(org.owner_user_id)
      .first<{ id: string; role: string }>()
    if (owner?.role === 'client') {
      await context.env.DB.prepare(`DELETE FROM users WHERE id = ? AND role = 'client'`)
        .bind(owner.id)
        .run()
      deletedUserId = owner.id
    }
  }

  return json({
    ok: true,
    deleted: {
      org_id: org.id,
      org_name: org.name,
      user_id: deletedUserId,
    },
  })
}
