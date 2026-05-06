import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'

type Metric = { label: string; value: string }

export async function onRequestGet(context: {
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const denied = requireSuperAdmin(context.data.user)
  if (denied) return denied

  const access = await getGoogleAccessTokenFromEnv(context.env)
  if (!access) {
    return json({
      configured: false,
      source: 'worker_env',
      accountDisplay: null as string | null,
      error: null,
      detail:
        'Defina GOOGLE_ADS_REFRESH_TOKEN (e escopos business.manage) + CLIENT_ID/SECRET no Worker.',
      metrics: [] as Metric[],
    })
  }

  try {
    const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${access}` },
    })
    const body = (await res.json()) as {
      accounts?: { name?: string; accountName?: string; type?: string }[]
      error?: { message?: string; status?: string }
    }

    if (!res.ok || body.error) {
      return json({
        configured: true,
        source: 'worker_env',
        accountDisplay: null as string | null,
        error:
          body.error?.message ||
          'Contas Business não listadas (confira escopo business.manage no refresh token).',
        detail: null,
        metrics: [] as Metric[],
      })
    }

    const accounts = body.accounts ?? []
    if (accounts.length === 0) {
      return json({
        configured: true,
        source: 'worker_env',
        accountDisplay: null as string | null,
        error: 'Nenhuma conta Google Business encontrada.',
        detail: null,
        metrics: [] as Metric[],
      })
    }

    const primary = accounts[0]
    const accountDisplay =
      primary?.accountName?.trim() ||
      primary?.name?.replace(/^accounts\//, '').trim() ||
      null

    const metrics: Metric[] = accounts.slice(0, 6).map((a, i) => ({
      label: `Conta ${i + 1}`,
      value: a.accountName || a.name?.replace('accounts/', '') || '—',
    }))

    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay,
      error: null,
      detail: `${accounts.length} conta(s) · Account Management API`,
      metrics,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro Google Business'
    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay: null as string | null,
      error: msg,
      detail: null,
      metrics: [] as Metric[],
    })
  }
}
