import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'
import {
  fetchMetaAccountsOverview,
  parseAccountsOverviewRange,
} from '../../../_lib/meta-accounts-overview-core'

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const token = context.env.META_ACCESS_TOKEN?.trim()
  if (!token) {
    return json({
      rows: [],
      range: null,
      error: 'META_ACCESS_TOKEN não configurado no Worker.',
    })
  }

  const url = new URL(context.request.url)
  const preset = url.searchParams.get('preset')
  const sinceParam = url.searchParams.get('since')?.trim() ?? ''
  const untilParam = url.searchParams.get('until')?.trim() ?? ''
  const { since, until } = parseAccountsOverviewRange(sinceParam, untilParam, preset)

  const result = await fetchMetaAccountsOverview(context.env, token, since, until)
  return json(result)
}
