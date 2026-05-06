import type { D1Database } from '@cloudflare/workers-types'
import type { WorkerEnv } from './worker-env'
import { decryptTokenFromStorage, encryptTokenForStorage } from './token-crypto'

export type AccountProvider = 'meta_ads' | 'instagram' | 'google_ads' | 'google_business'

export type ConnectedAccountRow = {
  id: string
  org_id: string
  provider: string
  external_id: string
  external_name: string | null
  oauth_credential_id: string | null
  status: string
}

type OAuthCredentialRow = {
  id: string
  access_token_enc: string | null
  refresh_token_enc: string | null
  expires_at: string | null
}

export async function getActiveConnectionForOrg(
  db: D1Database,
  orgId: string,
  provider: AccountProvider
): Promise<ConnectedAccountRow | null> {
  const sel = await db
    .prepare(`SELECT external_id FROM org_account_selections WHERE org_id = ? AND provider = ?`)
    .bind(orgId, provider)
    .first<{ external_id: string }>()

  if (sel?.external_id?.trim()) {
    const row = await db
      .prepare(
        `SELECT id, org_id, provider, external_id, external_name, oauth_credential_id, status
         FROM connected_accounts
         WHERE org_id = ? AND provider = ? AND external_id = ? AND status = 'active' LIMIT 1`
      )
      .bind(orgId, provider, sel.external_id.trim())
      .first<ConnectedAccountRow>()
    if (row) return row
  }

  return await db
    .prepare(
      `SELECT id, org_id, provider, external_id, external_name, oauth_credential_id, status
       FROM connected_accounts
       WHERE org_id = ? AND provider = ? AND status = 'active'
       ORDER BY datetime(updated_at) DESC LIMIT 1`
    )
    .bind(orgId, provider)
    .first<ConnectedAccountRow>()
}

export async function decryptMetaAccessToken(
  db: D1Database,
  env: WorkerEnv,
  oauthCredentialId: string | null
): Promise<string | null> {
  if (!oauthCredentialId) return null
  const encKey = env.OAUTH_ENC_KEY?.trim()
  if (!encKey) return null
  const row = await db
    .prepare(`SELECT access_token_enc FROM oauth_credentials WHERE id = ? LIMIT 1`)
    .bind(oauthCredentialId)
    .first<{ access_token_enc: string | null }>()
  const enc = row?.access_token_enc
  if (!enc) return null
  try {
    return await decryptTokenFromStorage(enc, encKey)
  } catch {
    return null
  }
}

async function loadOAuthRow(db: D1Database, id: string): Promise<OAuthCredentialRow | null> {
  return (
    (await db
      .prepare(
        `SELECT id, access_token_enc, refresh_token_enc, expires_at FROM oauth_credentials WHERE id = ? LIMIT 1`
      )
      .bind(id)
      .first<OAuthCredentialRow>()) ?? null
  )
}

function parseIsoMs(iso: string | null): number | null {
  if (!iso?.trim()) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

/** Access token Google válido (renova com refresh no D1 quando necessário). */
export async function getValidGoogleAccessTokenFromCredential(
  db: D1Database,
  env: WorkerEnv,
  oauthCredentialId: string | null
): Promise<string | null> {
  if (!oauthCredentialId) return null
  const encKey = env.OAUTH_ENC_KEY?.trim()
  const clientId = env.GOOGLE_ADS_CLIENT_ID?.trim()
  const clientSecret = env.GOOGLE_ADS_CLIENT_SECRET?.trim()
  if (!encKey || !clientId || !clientSecret) return null

  const row = await loadOAuthRow(db, oauthCredentialId)
  if (!row?.access_token_enc) return null

  const now = Date.now()
  const expMs = parseIsoMs(row.expires_at)
  const skewMs = 120_000
  let access = await decryptTokenFromStorage(row.access_token_enc, encKey).catch(() => null)
  if (!access) return null

  if (expMs != null && now < expMs - skewMs) {
    return access
  }

  if (!row.refresh_token_enc) {
    return access
  }

  let refreshPlain: string
  try {
    refreshPlain = await decryptTokenFromStorage(row.refresh_token_enc, encKey)
  } catch {
    return access
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshPlain,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const td = (await tr.json()) as {
    access_token?: string
    expires_in?: number
    error?: string
  }
  if (!tr.ok || !td.access_token) {
    return access
  }

  const newAccessEnc = await encryptTokenForStorage(td.access_token, encKey)
  const expSec = td.expires_in ? Math.floor(Date.now() / 1000) + td.expires_in : null
  const expiresAt = expSec ? new Date(expSec * 1000).toISOString() : null

  await db
    .prepare(
      `UPDATE oauth_credentials SET access_token_enc = ?, expires_at = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(newAccessEnc, expiresAt, oauthCredentialId)
    .run()

  return td.access_token
}
