import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'
import { listGoogleAdsAccountsFromEnv, type GoogleAdsAccountEntry } from '../../../_lib/google-ads-env'

export type GoogleAdsAccountRow = GoogleAdsAccountEntry

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const { env } = context
  const access = await getGoogleAccessTokenFromEnv(env)
  if (!access) {
    return json({
      accounts: [] as GoogleAdsAccountRow[],
      error: 'Defina GOOGLE_ADS_REFRESH_TOKEN + CLIENT_ID/SECRET para obter access token.',
    })
  }

  const url = new URL(context.request.url)
  const q = url.searchParams.get('q')?.trim().toLowerCase() || ''

  try {
    const { accounts, mccId, error } = await listGoogleAdsAccountsFromEnv(env, access, { searchQuery: q })
    return json({ accounts, mccId: mccId ?? null, error: error ?? null })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar contas Google Ads'
    return json({ accounts: [] as GoogleAdsAccountRow[], error: msg })
  }
}
