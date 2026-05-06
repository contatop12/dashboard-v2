import type { D1Database } from '@cloudflare/workers-types'
import { json, jsonError } from '../../../_lib/json'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'

const PROVIDERS = ['meta_ads', 'instagram', 'google_ads', 'google_business'] as const
export type AccountProvider = (typeof PROVIDERS)[number]

interface Env {
  DB: D1Database
}

type SelectionMap = Partial<Record<AccountProvider, string | null>>

async function loadSelections(db: D1Database, orgId: string): Promise<SelectionMap> {
  const { results } = await db
    .prepare(`SELECT provider, external_id FROM org_account_selections WHERE org_id = ?`)
    .bind(orgId)
    .all<{ provider: string; external_id: string }>()
  const out: SelectionMap = {}
  for (const r of results ?? []) {
    if (PROVIDERS.includes(r.provider as AccountProvider)) {
      out[r.provider as AccountProvider] = r.external_id
    }
  }
  return out
}

async function firstConnectionExternalId(
  db: D1Database,
  orgId: string,
  provider: AccountProvider
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT external_id FROM connected_accounts WHERE org_id = ? AND provider = ? AND status = 'active' ORDER BY datetime(updated_at) DESC LIMIT 1`
    )
    .bind(orgId, provider)
    .first<{ external_id: string }>()
  return row?.external_id ?? null
}

function buildEffective(selections: SelectionMap, dbFallbacks: Record<AccountProvider, string | null>): SelectionMap {
  const eff: SelectionMap = {}
  for (const p of PROVIDERS) {
    const sel = selections[p]?.trim()
    if (sel) eff[p] = sel
    else if (dbFallbacks[p]) eff[p] = dbFallbacks[p]
    else eff[p] = null
  }
  return eff
}

export async function onRequestGet(context: {
  env: Env
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
  const selections = await loadSelections(db, orgId)
  const fallbacks: Record<AccountProvider, string | null> = {
    meta_ads: await firstConnectionExternalId(db, orgId, 'meta_ads'),
    instagram: await firstConnectionExternalId(db, orgId, 'instagram'),
    google_ads: await firstConnectionExternalId(db, orgId, 'google_ads'),
    google_business: await firstConnectionExternalId(db, orgId, 'google_business'),
  }
  const effective = buildEffective(selections, fallbacks)

  return json({
    orgId,
    selections,
    effective,
    providers: PROVIDERS,
  })
}

export async function onRequestPatch(context: {
  request: Request
  env: Env
  data: { user?: UserRow | null }
  params: { id: string }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const orgId = context.params.id
  if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
    return jsonError('Sem acesso a esta organização', 403)
  }

  let body: { provider?: string; external_id?: string }
  try {
    body = await context.request.json()
  } catch {
    return jsonError('JSON inválido', 400)
  }

  const provider = String(body.provider ?? '').trim() as AccountProvider
  if (!PROVIDERS.includes(provider)) {
    return jsonError('provider inválido', 400)
  }

  const externalId = String(body.external_id ?? '').trim()
  if (!externalId) {
    return jsonError('external_id obrigatório', 400)
  }

  const exists = await context.env.DB.prepare(
    `SELECT id FROM connected_accounts WHERE org_id = ? AND provider = ? AND external_id = ? AND status = 'active' LIMIT 1`
  )
    .bind(orgId, provider, externalId)
    .first<{ id: string }>()

  if (!exists) {
    return jsonError('Conta não encontrada para esta organização', 404)
  }

  await context.env.DB.prepare(
    `INSERT INTO org_account_selections (org_id, provider, external_id, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(org_id, provider) DO UPDATE SET
       external_id = excluded.external_id,
       updated_at = excluded.updated_at`
  )
    .bind(orgId, provider, externalId)
    .run()

  return json({ ok: true, orgId, provider, external_id: externalId })
}
