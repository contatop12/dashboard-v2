import type { D1Database } from '@cloudflare/workers-types'
import type { WorkerEnv } from '../../../_lib/worker-env'
import { verifyOAuthState } from '../../../_lib/oauth-state'
import { encryptTokenForStorage } from '../../../_lib/token-crypto'

function redirectWithFlash(request: Request, params: Record<string, string>): Response {
  const u = new URL('/', request.url)
  for (const [k, v] of Object.entries(params)) {
    if (v) u.searchParams.set(k, v)
  }
  return Response.redirect(u.toString(), 302)
}

async function upsertOAuthCredential(
  db: D1Database,
  userId: string,
  provider: string,
  accessEnc: string,
  refreshEnc: string | null,
  expiresAt: string | null,
  scope: string
): Promise<string> {
  const row = await db
    .prepare(
      `SELECT id FROM oauth_credentials WHERE authorized_user_id = ? AND provider = ? LIMIT 1`
    )
    .bind(userId, provider)
    .first<{ id: string }>()
  if (row) {
    await db
      .prepare(
        `UPDATE oauth_credentials SET access_token_enc = ?, refresh_token_enc = ?, expires_at = ?, scope = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .bind(accessEnc, refreshEnc, expiresAt, scope, row.id)
      .run()
    return row.id
  }
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO oauth_credentials (id, provider, authorized_user_id, access_token_enc, refresh_token_enc, expires_at, scope)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, provider, userId, accessEnc, refreshEnc, expiresAt, scope)
    .run()
  return id
}

async function deleteOrgConnections(db: D1Database, orgId: string, providers: string[]): Promise<void> {
  if (providers.length === 0) return
  const ph = providers.map(() => '?').join(', ')
  await db
    .prepare(`DELETE FROM connected_accounts WHERE org_id = ? AND provider IN (${ph})`)
    .bind(orgId, ...providers)
    .run()
}

async function insertConnection(
  db: D1Database,
  orgId: string,
  provider: string,
  externalId: string,
  externalName: string | null,
  oauthCredId: string
): Promise<void> {
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO connected_accounts (id, org_id, provider, external_id, external_name, status, oauth_credential_id)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`
    )
    .bind(id, orgId, provider, externalId, externalName, oauthCredId)
    .run()
}

async function finishMeta(
  env: WorkerEnv,
  db: D1Database,
  code: string,
  redirectUri: string,
  orgId: string,
  userId: string,
  encKey: string
): Promise<void> {
  const appId = env.META_APP_ID!.trim()
  const secret = env.META_APP_SECRET!.trim()

  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('client_secret', secret)
  tokenUrl.searchParams.set('code', code)

  const tr = await fetch(tokenUrl.toString())
  const td = (await tr.json()) as { access_token?: string; error?: { message?: string } }
  if (!tr.ok || !td.access_token) {
    throw new Error(td.error?.message || 'Meta: troca de código falhou')
  }

  let access = td.access_token
  const ll = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  ll.searchParams.set('grant_type', 'fb_exchange_token')
  ll.searchParams.set('client_id', appId)
  ll.searchParams.set('client_secret', secret)
  ll.searchParams.set('fb_exchange_token', access)
  const lr = await fetch(ll.toString())
  const ld = (await lr.json()) as { access_token?: string }
  if (lr.ok && ld.access_token) access = ld.access_token

  const accessEnc = await encryptTokenForStorage(access, encKey)
  const credId = await upsertOAuthCredential(db, userId, 'meta', accessEnc, null, null, 'meta_graph')

  await deleteOrgConnections(db, orgId, ['meta_ads', 'instagram'])

  const adR = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?fields=name,account_id&limit=20&access_token=${encodeURIComponent(access)}`
  )
  const adD = (await adR.json()) as {
    data?: { name?: string; account_id?: string }[]
    error?: { message?: string }
  }
  if (adR.ok && adD.data?.length) {
    for (const a of adD.data) {
      const ext = a.account_id || ''
      if (!ext) continue
      await insertConnection(db, orgId, 'meta_ads', ext, a.name ?? ext, credId)
    }
  }

  const igR = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=name,instagram_business_account{id,username}&limit=50&access_token=${encodeURIComponent(access)}`
  )
  const igD = (await igR.json()) as {
    data?: { instagram_business_account?: { id?: string; username?: string } }[]
  }
  if (igR.ok && igD.data?.length) {
    for (const p of igD.data) {
      const ig = p.instagram_business_account
      if (!ig?.id) continue
      await insertConnection(
        db,
        orgId,
        'instagram',
        ig.id,
        ig.username ? `@${ig.username}` : ig.id,
        credId
      )
    }
  }
}

async function finishGoogle(
  env: WorkerEnv,
  db: D1Database,
  code: string,
  redirectUri: string,
  orgId: string,
  userId: string,
  encKey: string
): Promise<void> {
  const clientId = env.GOOGLE_ADS_CLIENT_ID!.trim()
  const clientSecret = env.GOOGLE_ADS_CLIENT_SECRET!.trim()
  const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  const rawVer = env.GOOGLE_ADS_API_VERSION?.trim() || 'v17'
  const ver = rawVer.startsWith('v') ? rawVer : `v${rawVer}`

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const td = (await tr.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }
  if (!tr.ok || !td.access_token) {
    throw new Error(td.error_description || td.error || 'Google: troca de código falhou')
  }

  const accessEnc = await encryptTokenForStorage(td.access_token, encKey)
  const refreshEnc = td.refresh_token ? await encryptTokenForStorage(td.refresh_token, encKey) : null
  const expSec = td.expires_in ? Math.floor(Date.now() / 1000) + td.expires_in : null
  const expiresAt = expSec ? new Date(expSec * 1000).toISOString() : null

  const credId = await upsertOAuthCredential(
    db,
    userId,
    'google',
    accessEnc,
    refreshEnc,
    expiresAt,
    'adwords business.manage'
  )

  await deleteOrgConnections(db, orgId, ['google_ads', 'google_business'])

  const access = td.access_token

  if (devToken) {
    const adsUrl = `https://googleads.googleapis.com/${ver}/customers:listAccessibleCustomers`
    const adsR = await fetch(adsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
        'developer-token': devToken,
      },
      body: '{}',
    })
    const adsD = (await adsR.json()) as { resourceNames?: string[] }
    if (adsR.ok && adsD.resourceNames?.length) {
      for (const rn of adsD.resourceNames.slice(0, 10)) {
        const id = rn.replace('customers/', '').replace(/-/g, '')
        await insertConnection(db, orgId, 'google_ads', id, `Cliente ${id}`, credId)
      }
    }
  }

  const bmR = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${access}` },
  })
  const bmD = (await bmR.json()) as {
    accounts?: { name?: string; accountName?: string }[]
  }
  if (bmR.ok && bmD.accounts?.length) {
    for (const acc of bmD.accounts.slice(0, 10)) {
      const name = acc.name || ''
      const ext = name.replace('accounts/', '') || name
      if (!ext) continue
      await insertConnection(db, orgId, 'google_business', ext, acc.accountName ?? ext, credId)
    }
  }
}

export async function onRequestGet(context: { request: Request; env: WorkerEnv; params: { provider: string } }): Promise<Response> {
  const { request, env } = context
  const url = new URL(request.url)
  const providerParam = context.params.provider
  if (providerParam !== 'meta' && providerParam !== 'google') {
    return redirectWithFlash(request, { oauth_error: '1', oauth_msg: 'provedor_invalido' })
  }
  const provider = providerParam as 'meta' | 'google'

  const encKey = env.OAUTH_ENC_KEY?.trim()
  if (!encKey) {
    return redirectWithFlash(request, { oauth_error: '1', oauth_msg: 'oauth_enc_key_ausente' })
  }

  const err = url.searchParams.get('error')
  const errDesc = url.searchParams.get('error_description') || url.searchParams.get('error_reason')
  if (err) {
    return redirectWithFlash(request, {
      oauth_error: '1',
      oauth_msg: encodeURIComponent(errDesc || err),
    })
  }

  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')
  if (!code || !stateRaw) {
    return redirectWithFlash(request, { oauth_error: '1', oauth_msg: 'callback_incompleto' })
  }

  const st = await verifyOAuthState(env, stateRaw)
  if (!st || st.p !== provider) {
    return redirectWithFlash(request, { oauth_error: '1', oauth_msg: 'state_invalido' })
  }

  const origin = url.origin
  const redirectUri = `${origin}/api/oauth/${provider}/callback`

  try {
    if (provider === 'meta') {
      if (!env.META_APP_ID?.trim() || !env.META_APP_SECRET?.trim()) {
        throw new Error('Meta app não configurada')
      }
      await finishMeta(env, env.DB, code, redirectUri, st.o, st.u, encKey)
    } else {
      if (!env.GOOGLE_ADS_CLIENT_ID?.trim() || !env.GOOGLE_ADS_CLIENT_SECRET?.trim()) {
        throw new Error('Google OAuth não configurado')
      }
      await finishGoogle(env, env.DB, code, redirectUri, st.o, st.u, encKey)
    }
    return redirectWithFlash(request, { oauth_ok: '1', oauth_provider: provider })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'oauth_falhou'
    return redirectWithFlash(request, { oauth_error: '1', oauth_msg: encodeURIComponent(msg.slice(0, 280)) })
  }
}
