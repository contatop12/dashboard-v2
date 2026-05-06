import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json, jsonError } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'
import {
  getActiveConnectionForOrg,
  getValidGoogleAccessTokenFromCredential,
} from '../../../_lib/org-platform-credentials'

type Metric = { label: string; value: string }

function normalizeGmbAccountKey(raw: string): string {
  return raw.trim().replace(/^accounts\//, '')
}

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const url = new URL(context.request.url)
  const orgId = url.searchParams.get('org_id')?.trim() || ''

  const tryListAccounts = async (
    access: string,
    source: 'worker_env' | 'oauth_org',
    preferredExternalId: string | null,
    fallbackDisplay: string | null
  ): Promise<Response> => {
    const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${access}` },
    })
    const body = (await res.json()) as {
      accounts?: { name?: string; accountName?: string }[]
      error?: { message?: string; status?: string }
    }

    if (!res.ok || body.error) {
      return json({
        configured: true,
        source,
        accountDisplay: fallbackDisplay,
        error:
          body.error?.message ||
          'Contas Business não listadas (confira escopo business.manage no refresh token).',
        detail: null,
        metrics: [] as Metric[],
      })
    }

    let accounts = body.accounts ?? []
    if (preferredExternalId?.trim()) {
      const want = normalizeGmbAccountKey(preferredExternalId)
      accounts = accounts.filter((a) => {
        const key = normalizeGmbAccountKey(a.name ?? '')
        return key === want || (a.name ?? '').includes(want)
      })
      if (accounts.length === 0) {
        return json({
          configured: true,
          source,
          accountDisplay: fallbackDisplay,
          error: 'Conta selecionada não encontrada na resposta da API.',
          detail: null,
          metrics: [] as Metric[],
        })
      }
    }

    if (accounts.length === 0) {
      return json({
        configured: true,
        source,
        accountDisplay: null,
        error: 'Nenhuma conta Google Business encontrada.',
        detail: null,
        metrics: [] as Metric[],
      })
    }

    const primary = accounts[0]
    const accountDisplay = primary?.accountName?.trim() || normalizeGmbAccountKey(primary?.name ?? '') || null

    const metrics: Metric[] = accounts.slice(0, 6).map((a, i) => ({
      label: `Conta ${i + 1}`,
      value: a.accountName || normalizeGmbAccountKey(a.name ?? '') || '—',
    }))

    return json({
      configured: true,
      source,
      accountDisplay,
      error: null,
      detail: `${accounts.length} conta(s) · Account Management API`,
      metrics,
    })
  }

  if (orgId) {
    if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
      return jsonError('Sem acesso a esta organização', 403)
    }
    const conn = await getActiveConnectionForOrg(context.env.DB, orgId, 'google_business')
    if (!conn) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: null,
        error: null,
        detail: 'Nenhuma conta Google Meu Negócio ligada a esta organização.',
        metrics: [] as Metric[],
      })
    }
    const access = await getValidGoogleAccessTokenFromCredential(
      context.env.DB,
      context.env,
      conn.oauth_credential_id
    )
    if (!access) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: conn.external_name,
        error: null,
        detail: 'Token Google indisponível. Reconecte em Integrações.',
        metrics: [] as Metric[],
      })
    }
    return tryListAccounts(
      access,
      'oauth_org',
      conn.external_id,
      conn.external_name?.trim() || null
    )
  }

  if (user.role !== 'super_admin') {
    return jsonError('org_id é obrigatório', 400)
  }

  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const access = await getGoogleAccessTokenFromEnv(context.env)
  if (!access) {
    return json({
      configured: false,
      source: 'worker_env',
      accountDisplay: null,
      error: null,
      detail:
        'Defina GOOGLE_ADS_REFRESH_TOKEN (e escopos business.manage) + CLIENT_ID/SECRET no Worker.',
      metrics: [] as Metric[],
    })
  }

  try {
    return await tryListAccounts(access, 'worker_env', null, null)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro Google Business'
    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay: null,
      error: msg,
      detail: null,
      metrics: [] as Metric[],
    })
  }
}
