import type { D1Database } from '@cloudflare/workers-types'
import type { WorkerEnv } from '../../../../_lib/worker-env'
import type { UserRow } from '../../../../_lib/auth'
import { userCanAccessOrg } from '../../../../_lib/auth'
import { json, jsonError } from '../../../../_lib/json'
import {
  decryptMetaAccessToken,
  getValidGoogleAccessTokenFromCredential,
} from '../../../../_lib/org-platform-credentials'

async function upsertConnection(
  db: D1Database,
  orgId: string,
  provider: string,
  externalId: string,
  externalName: string | null,
  credId: string
): Promise<'added' | 'updated'> {
  const existing = await db
    .prepare(
      `SELECT id FROM connected_accounts WHERE org_id = ? AND provider = ? AND external_id = ? LIMIT 1`
    )
    .bind(orgId, provider, externalId)
    .first<{ id: string }>()

  if (existing) {
    await db
      .prepare(
        `UPDATE connected_accounts SET external_name = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .bind(externalName, existing.id)
      .run()
    return 'updated'
  }

  await db
    .prepare(
      `INSERT INTO connected_accounts (id, org_id, provider, external_id, external_name, status, oauth_credential_id)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`
    )
    .bind(crypto.randomUUID(), orgId, provider, externalId, externalName, credId)
    .run()
  return 'added'
}

export async function onRequestPost(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
  params: { id: string }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const orgId = context.params.id
  if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
    return jsonError('Sem acesso a esta organização', 403)
  }

  const db = context.env.DB
  const env = context.env
  const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  const rawVer = env.GOOGLE_ADS_API_VERSION?.trim() || 'v17'
  const ver = rawVer.startsWith('v') ? rawVer : `v${rawVer}`

  let added = 0
  let updated = 0

  // --- Meta deep scan ---
  const metaConn = await db
    .prepare(
      `SELECT oauth_credential_id FROM connected_accounts
       WHERE org_id = ? AND provider IN ('meta_ads', 'instagram') AND oauth_credential_id IS NOT NULL
       LIMIT 1`
    )
    .bind(orgId)
    .first<{ oauth_credential_id: string }>()

  if (metaConn?.oauth_credential_id) {
    const credId = metaConn.oauth_credential_id
    const metaToken = await decryptMetaAccessToken(db, env, credId)

    if (metaToken) {
      const bizR = await fetch(
        `https://graph.facebook.com/v21.0/me/businesses?limit=5&access_token=${encodeURIComponent(metaToken)}`
      )
      const bizD = (await bizR.json()) as { data?: { id?: string }[] }

      for (const biz of bizD.data ?? []) {
        if (!biz.id) continue

        const [oaR, caR] = await Promise.all([
          fetch(
            `https://graph.facebook.com/v21.0/${biz.id}/owned_ad_accounts?fields=name,account_id&limit=50&access_token=${encodeURIComponent(metaToken)}`
          ),
          fetch(
            `https://graph.facebook.com/v21.0/${biz.id}/client_ad_accounts?fields=name,account_id&limit=50&access_token=${encodeURIComponent(metaToken)}`
          ),
        ])

        const [oaD, caD] = (await Promise.all([oaR.json(), caR.json()])) as [
          { data?: { name?: string; account_id?: string }[] },
          { data?: { name?: string; account_id?: string }[] },
        ]

        for (const a of [...(oaD.data ?? []), ...(caD.data ?? [])]) {
          if (!a.account_id) continue
          const r = await upsertConnection(
            db,
            orgId,
            'meta_ads',
            a.account_id,
            a.name ?? a.account_id,
            credId
          )
          if (r === 'added') added++
          else updated++
        }
      }

      const igR = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=name,instagram_business_account{id,username}&limit=50&access_token=${encodeURIComponent(metaToken)}`
      )
      const igD = (await igR.json()) as {
        data?: { instagram_business_account?: { id?: string; username?: string } }[]
      }
      for (const p of igD.data ?? []) {
        const ig = p.instagram_business_account
        if (!ig?.id) continue
        const r = await upsertConnection(
          db,
          orgId,
          'instagram',
          ig.id,
          ig.username ? `@${ig.username}` : ig.id,
          credId
        )
        if (r === 'added') added++
        else updated++
      }
    }
  }

  // --- Google deep scan ---
  const googleConn = await db
    .prepare(
      `SELECT oauth_credential_id FROM connected_accounts
       WHERE org_id = ? AND provider IN ('google_ads', 'google_business') AND oauth_credential_id IS NOT NULL
       LIMIT 1`
    )
    .bind(orgId)
    .first<{ oauth_credential_id: string }>()

  if (googleConn?.oauth_credential_id) {
    const credId = googleConn.oauth_credential_id
    const googleToken = await getValidGoogleAccessTokenFromCredential(db, env, credId)

    if (googleToken && devToken) {
      const adsR = await fetch(
        `https://googleads.googleapis.com/${ver}/customers:listAccessibleCustomers`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleToken}`,
            'Content-Type': 'application/json',
            'developer-token': devToken,
          },
          body: '{}',
        }
      )
      const adsD = (await adsR.json()) as { resourceNames?: string[] }
      const rns = (adsD.resourceNames ?? []).slice(0, 50)

      const nameResults = await Promise.all(
        rns.map(async (rn) => {
          const id = rn.replace('customers/', '').replace(/-/g, '')
          let name: string | null = null
          try {
            const sr = await fetch(
              `https://googleads.googleapis.com/${ver}/customers/${id}/googleAds:search`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${googleToken}`,
                  'developer-token': devToken,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query: 'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1',
                }),
              }
            )
            if (sr.ok) {
              const sd = (await sr.json()) as {
                results?: Array<{ customer?: { descriptiveName?: string } }>
              }
              name = sd.results?.[0]?.customer?.descriptiveName?.trim() || null
            }
          } catch {
            // skip — use fallback name
          }
          return { id, name }
        })
      )

      for (const { id, name } of nameResults) {
        const r = await upsertConnection(
          db,
          orgId,
          'google_ads',
          id,
          name ?? `Cliente ${id}`,
          credId
        )
        if (r === 'added') added++
        else updated++
      }
    }

    if (googleToken) {
      const bmR = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${googleToken}` },
      })
      const bmD = (await bmR.json()) as { accounts?: { name?: string; accountName?: string }[] }
      for (const acc of (bmD.accounts ?? []).slice(0, 50)) {
        const rawName = acc.name || ''
        const ext = rawName.replace('accounts/', '') || rawName
        if (!ext) continue
        const credId = googleConn.oauth_credential_id
        const r = await upsertConnection(
          db,
          orgId,
          'google_business',
          ext,
          acc.accountName ?? ext,
          credId
        )
        if (r === 'added') added++
        else updated++
      }
    }
  }

  return json({ added, updated })
}
