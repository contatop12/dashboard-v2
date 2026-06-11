import type { WorkerEnv } from './worker-env'

export type GoogleAdsAccountEntry = { id: string; name: string; isManager?: boolean }

export function customerPathId(raw: string): string {
  return raw.trim().replace(/^customers\//, '').replace(/-/g, '')
}

/** MCC / login-customer-id: aceita GOOGLE_ADS_LOGIN_CUSTOMER_ID ou GOOGLE_ADS_MCC_ID do .env. */
export function resolveGoogleLoginCustomerId(env: WorkerEnv): string | undefined {
  const raw = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim() || env.GOOGLE_ADS_MCC_ID?.trim()
  return raw ? customerPathId(raw) : undefined
}

/** Versão REST estável; sobrescreva com GOOGLE_ADS_API_VERSION no Worker. */
export function resolveGoogleApiVersion(env: WorkerEnv): string {
  const rawVer = env.GOOGLE_ADS_API_VERSION?.trim() || 'v21'
  return rawVer.startsWith('v') ? rawVer : `v${rawVer}`
}

export async function readGoogleAdsJson(
  res: Response
): Promise<{ ok: boolean; data: Record<string, unknown>; error?: string }> {
  const text = await res.text()
  const trimmed = text.trimStart()
  if (trimmed.startsWith('<')) {
    return {
      ok: false,
      data: {},
      error: `Google Ads API devolveu HTML (HTTP ${res.status}). Verifique GOOGLE_ADS_API_VERSION (ex.: v21) e developer token.`,
    }
  }
  try {
    const data = JSON.parse(text) as Record<string, unknown>
    return { ok: true, data }
  } catch {
    return {
      ok: false,
      data: {},
      error: `Resposta inválida da Google Ads API (HTTP ${res.status}).`,
    }
  }
}

function googleApiError(data: Record<string, unknown>, fallback: string): string {
  const err = data.error as { message?: string } | undefined
  if (err?.message) return err.message
  return fallback
}

/**
 * Lista clientes acessíveis pelo refresh token.
 * REST exige GET — POST neste endpoint devolve 404 HTML.
 * login-customer-id não deve ser enviado (ignorado pela API).
 */
export async function fetchListAccessibleCustomers(
  accessToken: string,
  developerToken: string,
  apiVersion: string
): Promise<{ resourceNames: string[]; error?: string }> {
  const ver = apiVersion.startsWith('v') ? apiVersion : `v${apiVersion}`
  const adsR = await fetch(`https://googleads.googleapis.com/${ver}/customers:listAccessibleCustomers`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'developer-token': developerToken,
    },
  })

  const parsed = await readGoogleAdsJson(adsR)
  if (!parsed.ok) {
    return { resourceNames: [], error: parsed.error }
  }

  const adsD = parsed.data as { resourceNames?: string[]; error?: { message?: string } }
  if (!adsR.ok || adsD.error) {
    return {
      resourceNames: [],
      error: googleApiError(adsD, `Google Ads API falhou ao listar clientes (HTTP ${adsR.status}).`),
    }
  }

  return { resourceNames: adsD.resourceNames ?? [] }
}

/** Nome descritivo de um customer via GAQL search. */
export async function fetchCustomerDescriptiveName(
  accessToken: string,
  developerToken: string,
  apiVersion: string,
  customerId: string,
  loginCustomerId?: string
): Promise<string | null> {
  const ver = apiVersion.startsWith('v') ? apiVersion : `v${apiVersion}`
  const id = customerPathId(customerId)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'developer-token': developerToken,
  }
  if (loginCustomerId) {
    headers['login-customer-id'] = customerPathId(loginCustomerId)
  }

  try {
    const sr = await fetch(`https://googleads.googleapis.com/${ver}/customers/${id}/googleAds:search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: 'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1',
      }),
    })
    const sp = await readGoogleAdsJson(sr)
    if (!sr.ok || !sp.ok) return null
    const sd = sp.data as { results?: Array<{ customer?: { descriptiveName?: string } }> }
    return sd.results?.[0]?.customer?.descriptiveName?.trim() || null
  } catch {
    return null
  }
}

/** Resolve nomes para uma lista de resourceNames (customers/123). */
export async function resolveCustomerNames(
  accessToken: string,
  developerToken: string,
  apiVersion: string,
  resourceNames: string[],
  loginCustomerId?: string,
  limit = 100
): Promise<Array<{ id: string; name: string }>> {
  const rns = resourceNames.slice(0, limit)
  const nameResults = await Promise.all(
    rns.map(async (rn) => {
      const id = customerPathId(rn.replace(/^customers\//, ''))
      const name =
        (await fetchCustomerDescriptiveName(
          accessToken,
          developerToken,
          apiVersion,
          id,
          loginCustomerId
        )) ?? `Cliente ${id}`
      return { id, name }
    })
  )
  return nameResults
}

/** Contas filhas do MCC via GAQL (inclui todas as subcontas, não só listAccessibleCustomers). */
export async function fetchMccClientAccounts(
  accessToken: string,
  developerToken: string,
  apiVersion: string,
  mccId: string
): Promise<{ accounts: GoogleAdsAccountEntry[]; error?: string }> {
  const ver = apiVersion.startsWith('v') ? apiVersion : `v${apiVersion}`
  const mcc = customerPathId(mccId)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'developer-token': developerToken,
    'login-customer-id': mcc,
  }
  const query =
    'SELECT customer_client.client_customer, customer_client.descriptive_name, customer_client.manager, customer_client.status FROM customer_client WHERE customer_client.status = ENABLED'

  const url = `https://googleads.googleapis.com/${ver}/customers/${mcc}/googleAds:search`
  const accounts: GoogleAdsAccountEntry[] = []
  let pageToken: string | undefined

  for (;;) {
    const body: { query: string; pageToken?: string } = { query }
    if (pageToken) body.pageToken = pageToken
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    const parsed = await readGoogleAdsJson(res)
    if (!parsed.ok || !res.ok) {
      return {
        accounts,
        error: googleApiError(parsed.data, `Falha ao listar contas do MCC (HTTP ${res.status}).`),
      }
    }
    const data = parsed.data as {
      results?: Array<{
        customerClient?: {
          clientCustomer?: string
          descriptiveName?: string
          manager?: boolean
        }
      }>
      nextPageToken?: string
    }
    for (const row of data.results ?? []) {
      const cc = row.customerClient
      if (!cc?.clientCustomer) continue
      const id = customerPathId(cc.clientCustomer)
      accounts.push({
        id,
        name: cc.descriptiveName?.trim() || `Cliente ${id}`,
        isManager: cc.manager === true,
      })
    }
    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  return { accounts }
}

export function mergeGoogleAdsAccountLists(
  accessible: GoogleAdsAccountEntry[],
  mccClients: GoogleAdsAccountEntry[],
  mccId?: string
): GoogleAdsAccountEntry[] {
  const mccNorm = mccId ? customerPathId(mccId) : undefined
  const byId = new Map<string, GoogleAdsAccountEntry>()
  for (const a of accessible) {
    byId.set(a.id, {
      ...a,
      isManager: a.isManager ?? (mccNorm ? a.id === mccNorm : false),
    })
  }
  for (const c of mccClients) {
    const prev = byId.get(c.id)
    if (prev) {
      byId.set(c.id, { ...prev, name: c.name || prev.name, isManager: c.isManager ?? prev.isManager })
    } else {
      byId.set(c.id, c)
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/** Lista unificada: listAccessibleCustomers + filhas do MCC quando configurado. */
export async function listGoogleAdsAccountsFromEnv(
  env: WorkerEnv,
  accessToken: string,
  options?: { searchQuery?: string; nameLimit?: number }
): Promise<{ accounts: GoogleAdsAccountEntry[]; mccId?: string; error?: string | null }> {
  const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  if (!devToken) {
    return { accounts: [], error: 'GOOGLE_ADS_DEVELOPER_TOKEN não configurado no Worker.' }
  }

  const ver = resolveGoogleApiVersion(env)
  const loginId = resolveGoogleLoginCustomerId(env)
  const nameLimit = options?.nameLimit ?? 200

  const listed = await fetchListAccessibleCustomers(accessToken, devToken, ver)
  if (listed.error && !loginId) {
    return { accounts: [], error: listed.error }
  }

  let accounts: GoogleAdsAccountEntry[] = listed.error
    ? []
    : (await resolveCustomerNames(accessToken, devToken, ver, listed.resourceNames, loginId, nameLimit)).map(
        (r) => ({ id: r.id, name: r.name })
      )

  let mccError: string | null = listed.error ?? null
  if (loginId) {
    const mccResult = await fetchMccClientAccounts(accessToken, devToken, ver, loginId)
    if (mccResult.error && accounts.length === 0) {
      return { accounts: [], mccId: loginId, error: mccResult.error }
    }
    if (mccResult.error) mccError = mccResult.error
    accounts = mergeGoogleAdsAccountLists(accounts, mccResult.accounts, loginId)
  }

  const q = options?.searchQuery?.trim().toLowerCase()
  const filtered = q
    ? accounts.filter((a) => `${a.name} ${a.id}`.toLowerCase().includes(q))
    : accounts

  return { accounts: filtered, mccId: loginId, error: mccError }
}
