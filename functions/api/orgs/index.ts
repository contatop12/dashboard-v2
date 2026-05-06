import type { D1Database } from '@cloudflare/workers-types'
import { json, jsonError } from '../../_lib/json'
import type { UserRow } from '../../_lib/auth'
import { slugify } from '../../_lib/auth'

interface Env {
  DB: D1Database
}

export async function onRequestGet(context: {
  env: Env
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const { env } = context

  if (user.role === 'super_admin') {
    const { results } = await env.DB.prepare(
      `SELECT id, name, slug, owner_user_id, created_at FROM organizations ORDER BY datetime(created_at) DESC`
    ).all()
    return json({ organizations: results ?? [] })
  }

  const { results } = await env.DB.prepare(
    `SELECT o.id, o.name, o.slug, o.owner_user_id, o.created_at
     FROM organizations o
     INNER JOIN organization_members m ON m.org_id = o.id
     WHERE m.user_id = ?
     ORDER BY datetime(o.created_at) DESC`
  )
    .bind(user.id)
    .all()

  return json({ organizations: results ?? [] })
}

export async function onRequestPost(context: {
  request: Request
  env: Env
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)
  if (user.role !== 'super_admin') return jsonError('Apenas super admin', 403)

  let body: { name?: string; slug?: string }
  try {
    body = await context.request.json()
  } catch {
    return jsonError('JSON inválido', 400)
  }

  const name = String(body.name ?? '').trim()
  if (!name) return jsonError('Nome da organização obrigatório', 400)

  let slug = body.slug ? slugify(String(body.slug)) : slugify(name)
  for (let attempt = 0; attempt < 8; attempt++) {
    const exists = await context.env.DB.prepare(
      `SELECT id FROM organizations WHERE slug = ? LIMIT 1`
    )
      .bind(slug)
      .first<{ id: string }>()
    if (!exists) break
    slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`
  }

  const id = crypto.randomUUID()
  await context.env.DB.prepare(
    `INSERT INTO organizations (id, name, slug, owner_user_id) VALUES (?, ?, ?, NULL)`
  )
    .bind(id, name, slug)
    .run()

  return json({ organization: { id, name, slug, owner_user_id: null } })
}
