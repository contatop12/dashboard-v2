import { json } from '../../_lib/json'
import type { WorkerEnv } from '../../_lib/worker-env'

/** URL de login do Cloudflare Access para o host atual (sem exigir usuário no D1). */
export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
}): Promise<Response> {
  const team = context.env.CF_ACCESS_TEAM_DOMAIN?.trim()
  const hostname = new URL(context.request.url).hostname
  if (!team) {
    return json({ url: null, error: 'CF_ACCESS_TEAM_DOMAIN não configurado' }, { status: 503 })
  }
  const url = `https://${team}/cdn-cgi/access/login/${hostname}`
  return json({ url })
}
