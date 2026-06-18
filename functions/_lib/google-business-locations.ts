/** Lista de locais (Business Information API). */
import type { HttpGet } from './google-business-performance'

export type BusinessLocation = { id: string; label: string; address: string | null }

export function parseLocations(body: unknown): BusinessLocation[] {
  const root = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const locs = Array.isArray(root.locations) ? root.locations : []
  const out: BusinessLocation[] = []
  for (const l of locs) {
    const o = l as Record<string, unknown>
    const id = String(o.name ?? '').replace(/^locations\//, '').trim()
    if (!id) continue
    const addr = (o.storefrontAddress ?? {}) as Record<string, unknown>
    const address =
      [addr.locality, addr.administrativeArea].filter((x) => typeof x === 'string' && x).join(', ') || null
    out.push({
      id,
      label: typeof o.title === 'string' && o.title.trim() ? o.title.trim() : `Local ${id}`,
      address,
    })
  }
  return out
}

export async function fetchLocations(
  httpGet: HttpGet,
  accountId: string
): Promise<{ items: BusinessLocation[]; error: string | null }> {
  const url =
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations` +
    `?readMask=name,title,storefrontAddress&pageSize=100`
  const res = await httpGet(url)
  if (!res.ok) {
    const j = res.json as { error?: { message?: string } }
    return { items: [], error: j?.error?.message || `Locations API (${res.status})` }
  }
  return { items: parseLocations(res.json), error: null }
}
