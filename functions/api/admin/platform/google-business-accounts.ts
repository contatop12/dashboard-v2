import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'
import {
  fetchGoogleBusinessAccounts,
  makeGmbHttpGet,
  type GoogleBusinessAccountRow,
} from '../../../_lib/google-business-accounts'

export type { GoogleBusinessAccountRow }

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
      accounts: [] as GoogleBusinessAccountRow[],
      error: 'Defina GOOGLE_ADS_REFRESH_TOKEN (escopo business.manage) + CLIENT_ID/SECRET no Worker.',
    })
  }

  const url = new URL(context.request.url)
  const q = url.searchParams.get('q')?.trim().toLowerCase() || ''

  try {
    const { accounts, error } = await fetchGoogleBusinessAccounts(makeGmbHttpGet(access))
    if (error && accounts.length === 0) {
      return json({ accounts: [] as GoogleBusinessAccountRow[], error })
    }

    const filtered = q
      ? accounts.filter((a) => `${a.name} ${a.id}`.toLowerCase().includes(q))
      : accounts

    return json({ accounts: filtered, error: error ?? null })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar contas Google Business'
    return json({ accounts: [] as GoogleBusinessAccountRow[], error: msg })
  }
}
