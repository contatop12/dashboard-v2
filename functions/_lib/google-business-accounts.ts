/** Listagem de contas Google Business Profile (Account Management API). */

export type GoogleBusinessAccountRow = { id: string; name: string; type?: string }

export type GmbHttpGet = (
  url: string
) => Promise<{ ok: boolean; status: number; json: unknown }>

const PARENT_ACCOUNT_TYPES = new Set(['ORGANIZATION', 'USER_GROUP', 'LOCATION_GROUP'])

export function normalizeGmbAccountId(raw: string): string {
  return raw.trim().replace(/^accounts\//, '')
}

function parseAccount(raw: { name?: string; accountName?: string; type?: string }): GoogleBusinessAccountRow | null {
  const id = normalizeGmbAccountId(raw.name ?? '')
  if (!id) return null
  return {
    id,
    name: raw.accountName?.trim() || id,
    type: raw.type,
  }
}

/** Lista contas com paginação e filhos de grupos/organizações via parentAccount. */
export async function fetchGoogleBusinessAccounts(
  httpGet: GmbHttpGet
): Promise<{ accounts: GoogleBusinessAccountRow[]; error: string | null }> {
  const byId = new Map<string, GoogleBusinessAccountRow>()

  async function listPages(parentAccount?: string): Promise<string | null> {
    let pageToken: string | undefined
    do {
      const params = new URLSearchParams({ pageSize: '20' })
      if (pageToken) params.set('pageToken', pageToken)
      if (parentAccount) params.set('parentAccount', parentAccount)

      const res = await httpGet(
        `https://mybusinessaccountmanagement.googleapis.com/v1/accounts?${params.toString()}`
      )
      if (!res.ok) {
        const j = res.json as { error?: { message?: string } }
        return j?.error?.message || `Account API (${res.status})`
      }

      const body = res.json as {
        accounts?: { name?: string; accountName?: string; type?: string }[]
        nextPageToken?: string
      }

      for (const raw of body.accounts ?? []) {
        const row = parseAccount(raw)
        if (row) byId.set(row.id, row)
      }

      pageToken = body.nextPageToken?.trim() || undefined
    } while (pageToken)

    return null
  }

  const rootErr = await listPages()
  if (rootErr && byId.size === 0) {
    return { accounts: [], error: rootErr }
  }

  const parents = [...byId.values()].filter((a) => a.type && PARENT_ACCOUNT_TYPES.has(a.type))
  for (const parent of parents) {
    await listPages(`accounts/${parent.id}`)
  }

  const accounts = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  return { accounts, error: null }
}

export function makeGmbHttpGet(accessToken: string): GmbHttpGet {
  return async (url: string) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, json }
  }
}
