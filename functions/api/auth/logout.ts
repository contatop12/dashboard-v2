import { json } from '../../_lib/json'
import type { WorkerEnv } from '../../_lib/worker-env'

export async function onRequestPost(context: {
  request: Request
  env: WorkerEnv
}): Promise<Response> {
  const { request, env } = context
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim()
  const origin = new URL(request.url).origin
  const logoutUrl = team
    ? `https://${team}/cdn-cgi/access/logout?redirect_url=${encodeURIComponent(origin)}`
    : null
  return json({ ok: true, logoutUrl })
}
