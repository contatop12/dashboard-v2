import type { D1Database } from '@cloudflare/workers-types'
import { verifyPassword } from '../../_lib/passwords'
import { json, jsonError } from '../../_lib/json'
import {
  SESSION_MAX_AGE_SEC,
  buildSetCookieHeader,
} from '../../_lib/session'

interface Env {
  DB: D1Database
}

type UserDb = {
  id: string
  email: string
  password_hash: string
  password_salt: string
  role: string
  name: string | null
}

export async function onRequestPost(context: {
  request: Request
  env: Env
}): Promise<Response> {
  const { request, env } = context

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return jsonError('JSON inválido', 400)
  }

  const email = String(body.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(body.password ?? '')
  if (!email || !password) {
    return jsonError('E-mail e senha obrigatórios', 400)
  }

  const row = await env.DB.prepare(
    `SELECT id, email, password_hash, password_salt, role, name FROM users WHERE email = ? LIMIT 1`
  )
    .bind(email)
    .first<UserDb>()

  if (!row || !(await verifyPassword(password, row.password_salt, row.password_hash))) {
    return jsonError('Credenciais inválidas', 401)
  }

  const sessionId = crypto.randomUUID()
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000).toISOString()

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
  )
    .bind(sessionId, row.id, expires)
    .run()

  const userOut = {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
  }

  const res = json({ user: userOut })
  res.headers.append('Set-Cookie', buildSetCookieHeader(sessionId, request))
  return res
}
