import type { D1Database } from '@cloudflare/workers-types'
import { json, jsonError } from '../../_lib/json'
import type { UserRow } from '../../_lib/auth'
import { slugify } from '../../_lib/auth'
import { derivePasswordHash, bytesToHex } from '../../_lib/passwords'

interface Env {
  DB: D1Database
}

export async function onRequestGet(context: {
  env: Env
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)
  if (user.role !== 'super_admin') return jsonError('Apenas super admin', 403)

  const { results } = await context.env.DB.prepare(
    `SELECT u.id as user_id, u.email as email, u.name as name, u.created_at as user_created_at,
            o.id as org_id, o.name as org_name, o.slug as org_slug
     FROM users u
     LEFT JOIN organization_members m ON m.user_id = u.id AND m.role = 'owner'
     LEFT JOIN organizations o ON o.id = m.org_id
     WHERE u.role = 'client'
     ORDER BY datetime(u.created_at) DESC`
  ).all()

  return json({ clients: results ?? [] })
}

export async function onRequestPost(context: {
  request: Request
  env: Env
  data: { user?: UserRow | null }
}): Promise<Response> {
  const admin = context.data.user
  if (!admin) return jsonError('Não autorizado', 401)
  if (admin.role !== 'super_admin') return jsonError('Apenas super admin', 403)

  let body: { email?: string; password?: string; organizationName?: string; name?: string }
  try {
    body = await context.request.json()
  } catch {
    return jsonError('JSON inválido', 400)
  }

  const email = String(body.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(body.password ?? '')
  const organizationName = String(body.organizationName ?? '').trim()
  const displayName = String(body.name ?? '').trim() || null

  if (!email || !password || !organizationName) {
    return jsonError('email, password e organizationName são obrigatórios', 400)
  }

  const exists = await context.env.DB.prepare(
    `SELECT id FROM users WHERE email = ? LIMIT 1`
  )
    .bind(email)
    .first<{ id: string }>()
  if (exists) return jsonError('E-mail já cadastrado', 409)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hashBuf = await derivePasswordHash(password, salt)
  const saltHex = bytesToHex(salt)
  const hashHex = bytesToHex(hashBuf)

  const userId = crypto.randomUUID()
  const orgId = crypto.randomUUID()

  let slug = slugify(organizationName)
  for (let attempt = 0; attempt < 8; attempt++) {
    const slugTaken = await context.env.DB.prepare(
      `SELECT id FROM organizations WHERE slug = ? LIMIT 1`
    )
      .bind(slug)
      .first<{ id: string }>()
    if (!slugTaken) break
    slug = `${slugify(organizationName)}-${crypto.randomUUID().slice(0, 8)}`
  }

  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, password_salt, role, name)
       VALUES (?, ?, ?, ?, 'client', ?)`
    ).bind(userId, email, hashHex, saltHex, displayName),
    context.env.DB.prepare(
      `INSERT INTO organizations (id, name, slug, owner_user_id)
       VALUES (?, ?, ?, ?)`
    ).bind(orgId, organizationName, slug, userId),
    context.env.DB.prepare(
      `INSERT INTO organization_members (org_id, user_id, role)
       VALUES (?, ?, 'owner')`
    ).bind(orgId, userId),
  ])

  return json({
    user: { id: userId, email, name: displayName, role: 'client' },
    organization: { id: orgId, name: organizationName, slug },
    temporaryPassword: password,
    inviteNote:
      'Guarde a senha temporária ou altere após primeiro login (OAuth / recuperação na próxima onda).',
  })
}
