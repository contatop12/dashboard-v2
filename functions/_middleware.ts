import { findUserBySession, touchSession, type UserRow } from './_lib/auth'
import { getSessionIdFromRequest } from './_lib/session'
import { jsonError } from './_lib/json'
import { verifyAccessJwt, ACCESS_JWT_HEADER } from './_lib/access'
import { withSecurityHeaders } from './_lib/security-headers'
import type { WorkerEnv } from './_lib/worker-env'

type Data = { user?: UserRow | null }

export async function onRequest(context: {
  request: Request
  env: WorkerEnv
  next: () => Promise<Response>
  data: Data
}): Promise<Response> {
  const { request, env, next, data } = context
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // Every response leaves with hardening headers (CSP, HSTS, frame-options, …).
  const respond = (r: Response) => withSecurityHeaders(r, env)

  if (!path.startsWith('/api/')) {
    return respond(await next())
  }

  // Defense-in-depth: when Cloudflare Access is configured, every API request must
  // carry a valid Access JWT. The edge already enforces this; verifying again means
  // the Worker rejects anything that bypassed Access.
  const accessTeam = env.CF_ACCESS_TEAM_DOMAIN?.trim()
  const accessAud = env.CF_ACCESS_AUD?.trim()
  if (accessTeam && accessAud) {
    try {
      await verifyAccessJwt(request.headers.get(ACCESS_JWT_HEADER), {
        teamDomain: accessTeam,
        aud: accessAud,
      })
    } catch {
      return respond(jsonError('Acesso negado (Cloudflare Access)', 403))
    }
  }

  if (method === 'GET' && /^\/api\/oauth\/[^/]+\/callback$/.test(path)) {
    return respond(await next())
  }

  const sessionId = getSessionIdFromRequest(request)
  const user = await findUserBySession(env.DB, sessionId)
  if (user && sessionId) {
    await touchSession(env.DB, sessionId).catch(() => {})
  }

  data.user = user

  if (path === '/api/auth/login' && method === 'POST') {
    return respond(await next())
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    return respond(await next())
  }
  if (path === '/api/auth/me' && method === 'GET') {
    return respond(await next())
  }

  if (!user) {
    return respond(jsonError('Não autorizado', 401))
  }

  return respond(await next())
}
