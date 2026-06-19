import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'

export type GoogleBusinessAccountRow = { id: string; name: string }

function normalizeGmbAccountKey(raw: string): string {
  return raw.trim().replace(/^accounts\//, '')
}

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
    const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${access}` },
    })
    const body = (await res.json().catch(() => ({}))) as {
      accounts?: { name?: string; accountName?: string }[]
      error?: { message?: string }
    }
    if (!res.ok) {
      return json({
        accounts: [] as GoogleBusinessAccountRow[],
        error: body?.error?.message || `Account API (${res.status})`,
      })
    }

    const accounts: GoogleBusinessAccountRow[] = (body.accounts ?? []).map((a) => {
      const id = normalizeGmbAccountKey(a.name ?? '')
      return {
        id,
        name: a.accountName?.trim() || id || 'Conta GBP',
      }
    })

    const filtered = q
      ? accounts.filter((a) => `${a.name} ${a.id}`.toLowerCase().includes(q))
      : accounts

    return json({ accounts: filtered, error: null as string | null })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar contas Google Business'
    return json({ accounts: [] as GoogleBusinessAccountRow[], error: msg })
  }
}
