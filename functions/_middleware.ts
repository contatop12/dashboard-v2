import type { D1Database } from '@cloudflare/workers-types'
import { findUserBySession, touchSession, type UserRow } from './_lib/auth'
import { getSessionIdFromRequest } from './_lib/session'
import { jsonError } from './_lib/json'

interface Env {
  DB: D1Database
}

type Data = { user?: UserRow | null }

export async function onRequest(context: {
  request: Request
  env: Env
  next: () => Promise<Response>
  data: Data
}): Promise<Response> {
  const { request, env, next, data } = context
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (!path.startsWith('/api/')) {
    return next()
  }

  const sessionId = getSessionIdFromRequest(request)
  const user = await findUserBySession(env.DB, sessionId)
  if (user && sessionId) {
    await touchSession(env.DB, sessionId).catch(() => {})
  }

  data.user = user

  if (path === '/api/auth/login' && method === 'POST') {
    return next()
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    return next()
  }
  if (path === '/api/auth/me' && method === 'GET') {
    return next()
  }

  if (!user) {
    return jsonError('Não autorizado', 401)
  }

  return next()
}
