import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { json, jsonError } from '../../../_lib/json'
import { buildGeralOverview } from '../../../_lib/geral-overview-core'

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const url = new URL(context.request.url)
  const orgId = url.searchParams.get('org_id')?.trim() || ''

  if (orgId && !(await userCanAccessOrg(context.env.DB, user, orgId))) {
    return jsonError('Sem acesso a esta organização', 403)
  }

  const body = await buildGeralOverview(
    context.env,
    context.env.DB,
    url,
    orgId || null,
    user.role === 'super_admin'
  )
  return json(body)
}
