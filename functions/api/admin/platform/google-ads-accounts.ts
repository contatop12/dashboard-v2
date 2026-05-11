import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'

export type GoogleAdsAccountRow = { id: string; name: string }

function customerPathId(raw: string): string {
  return raw.trim().replace(/^customers\//, '').replace(/-/g, '')
}

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const { env } = context
  const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  if (!devToken) {
    return json({
      accounts: [] as GoogleAdsAccountRow[],
      error: 'GOOGLE_ADS_DEVELOPER_TOKEN não configurado no Worker.',
    })
  }

  const access = await getGoogleAccessTokenFromEnv(env)
  if (!access) {
    return json({
      accounts: [] as GoogleAdsAccountRow[],
      error: 'Defina GOOGLE_ADS_REFRESH_TOKEN + CLIENT_ID/SECRET para obter access token.',
    })
  }

  const url = new URL(context.request.url)
  const q = url.searchParams.get('q')?.trim().toLowerCase() || ''

  const rawVer = env.GOOGLE_ADS_API_VERSION?.trim() || 'v17'
  const ver = rawVer.startsWith('v') ? rawVer : `v${rawVer}`
  const loginId = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    'Content-Type': 'application/json',
    'developer-token': devToken,
  }
  if (loginId) {
    headers['login-customer-id'] = customerPathId(loginId)
  }

  try {
    const adsR = await fetch(`https://googleads.googleapis.com/${ver}/customers:listAccessibleCustomers`, {
      method: 'POST',
      headers,
      body: '{}',
    })
    const adsD = (await adsR.json()) as { resourceNames?: string[]; error?: { message?: string } }
    if (!adsR.ok || adsD.error) {
      return json({
        accounts: [] as GoogleAdsAccountRow[],
        error: adsD.error?.message || 'Google Ads API falhou ao listar clientes',
      })
    }

    const rns = (adsD.resourceNames ?? []).slice(0, 100)
    const nameResults = await Promise.all(
      rns.map(async (rn) => {
        const id = rn.replace('customers/', '').replace(/-/g, '')
        let name: string | null = null
        try {
          const sr = await fetch(
            `https://googleads.googleapis.com/${ver}/customers/${id}/googleAds:search`,
            {
              method: 'POST',
              headers,
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
          /* ignore */
        }
        return { id, name: name ?? `Cliente ${id}` }
      })
    )

    const merged: GoogleAdsAccountRow[] = nameResults.map(({ id, name }) => ({ id, name }))
    const filtered = q
      ? merged.filter((a) => `${a.name} ${a.id}`.toLowerCase().includes(q))
      : merged

    return json({ accounts: filtered, error: null as string | null })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar contas Google Ads'
    return json({ accounts: [] as GoogleAdsAccountRow[], error: msg })
  }
}
