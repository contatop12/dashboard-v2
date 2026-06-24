import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'
import {
  fetchGoogleAccountsOverview,
  parseAccountsOverviewRange,
} from '../../../_lib/google-accounts-overview-core'

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const access = await getGoogleAccessTokenFromEnv(context.env)
  if (!access) {
    return json({
      rows: [],
      range: null,
      error: 'Defina GOOGLE_ADS_REFRESH_TOKEN + CLIENT_ID/SECRET para obter access token.',
    })
  }

  const url = new URL(context.request.url)
  const preset = url.searchParams.get('preset')
  const sinceParam = url.searchParams.get('since')?.trim() ?? ''
  const untilParam = url.searchParams.get('until')?.trim() ?? ''
  const { since, until } = parseAccountsOverviewRange(sinceParam, untilParam, preset)

  const result = await fetchGoogleAccountsOverview(context.env, access, since, until)
  return json(result)
}
