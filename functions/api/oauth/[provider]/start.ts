import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { jsonError } from '../../../_lib/json'

/** OAuth desativado temporariamente — contas atribuídas pelo super admin via secrets. */
export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
  params: { provider: string }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  return jsonError(
    'Login OAuth temporariamente desativado. O super admin atribui contas Meta/Google em Clientes → Editar.',
    503
  )
}
