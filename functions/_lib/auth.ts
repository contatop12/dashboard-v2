import type { D1Database } from '@cloudflare/workers-types'

export type UserRow = {
  id: string
  email: string
  role: 'super_admin' | 'client'
  name: string | null
}

export async function findUserBySession(
  db: D1Database,
  sessionId: string | null
): Promise<UserRow | null> {
  if (!sessionId) return null
  const row = await db
    .prepare(
      `SELECT u.id as id, u.email as email, u.role as role, u.name as name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')`
    )
    .bind(sessionId)
    .first<UserRow>()
  return row ?? null
}

export async function touchSession(db: D1Database, sessionId: string): Promise<void> {
  await db
    .prepare(`UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?`)
    .bind(sessionId)
    .run()
}

export async function userCanAccessOrg(
  db: D1Database,
  user: UserRow,
  orgId: string
): Promise<boolean> {
  if (user.role === 'super_admin') return true
  const row = await db
    .prepare(
      `SELECT 1 as ok FROM organization_members WHERE org_id = ? AND user_id = ? LIMIT 1`
    )
    .bind(orgId, user.id)
    .first<{ ok: number }>()
  return Boolean(row)
}

export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return base || 'org'
}
