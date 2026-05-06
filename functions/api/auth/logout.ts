import type { D1Database } from '@cloudflare/workers-types'
import type { UserRow } from '../../_lib/auth'
import { json } from '../../_lib/json'
import {
  getSessionIdFromRequest,
  buildClearCookieHeader,
} from '../../_lib/session'
interface Env {
  DB: D1Database
}

export async function onRequestPost(context: {
  request: Request
  env: Env
  data: { user?: UserRow | null }
}): Promise<Response> {
  const { request, env, data } = context
  const sid = getSessionIdFromRequest(request)
  if (sid) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sid).run()
  }
  const res = json({ ok: true })
  res.headers.append('Set-Cookie', buildClearCookieHeader(request))
  void data
  return res
}
