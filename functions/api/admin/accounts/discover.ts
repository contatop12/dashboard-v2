import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'
import { listGoogleAdsAccountsFromEnv } from '../../../_lib/google-ads-env'
import {
  fetchGoogleBusinessAccounts,
  makeGmbHttpGet,
} from '../../../_lib/google-business-accounts'

type DiscoverResult = {
  meta_ads: number
  instagram: number
  google_ads: number
  google_business: number
}

async function upsertAdminAccount(
  db: WorkerEnv['DB'],
  provider: string,
  externalId: string,
  externalName: string | null
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO admin_env_accounts (id, provider, external_id, external_name)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(provider, external_id) DO UPDATE SET
         external_name = excluded.external_name,
         updated_at = datetime('now')`
    )
    .bind(crypto.randomUUID(), provider, externalId, externalName)
    .run()
}

export async function onRequestPost(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const env = context.env
  const db = env.DB
  const result: DiscoverResult = { meta_ads: 0, instagram: 0, google_ads: 0, google_business: 0 }

  const metaToken = env.META_ACCESS_TOKEN?.trim()
  const bizId = env.META_BUSINESS_ID?.trim()

  if (metaToken && bizId) {
    const [ownedR, clientR, igR] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v21.0/${bizId}/owned_ad_accounts?fields=name,account_id&limit=50&access_token=${encodeURIComponent(metaToken)}`
      ),
      fetch(
        `https://graph.facebook.com/v21.0/${bizId}/client_ad_accounts?fields=name,account_id&limit=50&access_token=${encodeURIComponent(metaToken)}`
      ),
      fetch(
        `https://graph.facebook.com/v21.0/${bizId}/instagram_accounts?fields=id,username&limit=50&access_token=${encodeURIComponent(metaToken)}`
      ),
    ])

    const [ownedD, clientD, igD] = (await Promise.all([
      ownedR.json(),
      clientR.json(),
      igR.json(),
    ])) as [
      { data?: { name?: string; account_id?: string }[] },
      { data?: { name?: string; account_id?: string }[] },
      { data?: { id?: string; username?: string }[] },
    ]

    const seen = new Set<string>()
    for (const a of [...(ownedD.data ?? []), ...(clientD.data ?? [])]) {
      if (!a.account_id || seen.has(a.account_id)) continue
      seen.add(a.account_id)
      await upsertAdminAccount(db, 'meta_ads', a.account_id, a.name ?? a.account_id)
      result.meta_ads++
    }

    for (const a of igD.data ?? []) {
      if (!a.id) continue
      await upsertAdminAccount(db, 'instagram', a.id, a.username ? `@${a.username}` : a.id)
      result.instagram++
    }
  } else if (metaToken) {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=name,account_id&limit=50&access_token=${encodeURIComponent(metaToken)}`
    )
    const d = (await r.json()) as { data?: { name?: string; account_id?: string }[] }
    for (const a of d.data ?? []) {
      if (!a.account_id) continue
      await upsertAdminAccount(db, 'meta_ads', a.account_id, a.name ?? a.account_id)
      result.meta_ads++
    }
  }

  const googleAccess = await getGoogleAccessTokenFromEnv(env)

  if (googleAccess) {
    const { accounts, error } = await listGoogleAdsAccountsFromEnv(env, googleAccess, { nameLimit: 200 })
    if (error && accounts.length === 0) {
      // continua com google_business mesmo se listagem Ads falhar
    }
    for (const { id, name } of accounts) {
      await upsertAdminAccount(db, 'google_ads', id, name ?? `Cliente ${id}`)
      result.google_ads++
    }

    const { accounts: gmbAccounts } = await fetchGoogleBusinessAccounts(makeGmbHttpGet(googleAccess))
    for (const acc of gmbAccounts.slice(0, 100)) {
      await upsertAdminAccount(db, 'google_business', acc.id, acc.name)
      result.google_business++
    }
  }

  return json(result)
}
