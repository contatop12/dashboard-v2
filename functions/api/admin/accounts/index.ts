import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'

type AccountRow = {
  id: string
  provider: string
  external_id: string
  external_name: string | null
  status: string
  discovered_at: string
  updated_at: string
}

export async function onRequestGet(context: {
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const { results } = await context.env.DB.prepare(
    `SELECT id, provider, external_id, external_name, status, discovered_at, updated_at
     FROM admin_env_accounts
     ORDER BY provider, COALESCE(external_name, external_id)`
  ).all<AccountRow>()

  const grouped: Record<string, AccountRow[]> = {
    meta_ads: [],
    instagram: [],
    google_ads: [],
    google_business: [],
  }
  for (const row of results ?? []) {
    if (grouped[row.provider]) grouped[row.provider].push(row)
  }

  return json(grouped)
}
