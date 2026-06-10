import type { UserRow } from './_lib/auth'
import { json, jsonError } from './_lib/json'
import { verifyAccessJwt, ACCESS_JWT_HEADER } from './_lib/access'
import { parseAllowedEmails, resolveUserFromAccess } from './_lib/access-auth'
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

  const respond = (r: Response) => withSecurityHeaders(r, env)

  if (!path.startsWith('/api/')) {
    return respond(await next())
  }

  const accessTeam = env.CF_ACCESS_TEAM_DOMAIN?.trim()
  const accessAud = env.CF_ACCESS_AUD?.trim()
  if (!accessTeam || !accessAud) {
    return respond(
      jsonError('Cloudflare Access não configurado no Worker (CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD)', 503)
    )
  }

  // Rotas públicas (só exigem config Access, não usuário no D1)
  if (path === '/api/auth/access-login-url' && method === 'GET') {
    return respond(await next())
  }

  let accessPayload
  try {
    accessPayload = await verifyAccessJwt(request.headers.get(ACCESS_JWT_HEADER), {
      teamDomain: accessTeam,
      aud: accessAud,
    })
  } catch {
    return respond(jsonError('Acesso negado (Cloudflare Access)', 403))
  }

  const allowedEmails = parseAllowedEmails(env.ACCESS_ALLOWED_EMAILS)
  const user = await resolveUserFromAccess(env.DB, accessPayload, allowedEmails)
  if (!user) {
    const email = typeof accessPayload.email === 'string' ? accessPayload.email : ''
    if (!email) {
      return respond(jsonError('E-mail não encontrado no token do Cloudflare Access', 403))
    }
    if (!allowedEmails.has(email.trim().toLowerCase())) {
      return respond(jsonError('E-mail não autorizado', 403))
    }
    return respond(jsonError('Usuário não provisionado no dashboard. Execute npm run db:seed.', 403))
  }

  data.user = user

  if (path === '/api/auth/login' && method === 'POST') {
    return respond(jsonError('Login por senha desativado. Use Cloudflare Access.', 410))
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    return respond(await next())
  }

  if (path === '/api/auth/me' && method === 'GET') {
    return respond(await next())
  }

  return respond(await next())
}
