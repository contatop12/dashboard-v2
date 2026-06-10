export type GoogleDimensionFilters = {
  campaignIds: string[]
  adGroupId: string | null
  adId: string | null
}

function sanitizeId(v: string | null | undefined): string | null {
  const s = String(v ?? '').trim()
  return /^\d+$/.test(s) ? s : null
}

/** Prefixo numérico de um param (ex. "99x" → "99"); null sem dígitos iniciais. */
function leadingDigits(v: string | null): string | null {
  return v ? (v.match(/^\d+/)?.[0] ?? null) : null
}

export function parseGoogleDimensionFilters(url: URL): GoogleDimensionFilters {
  const rawIds = url.searchParams.get('campaign_ids')?.split(',') ?? []
  const campaignIds = rawIds.map((s) => sanitizeId(s)).filter((s): s is string => s != null)
  return {
    campaignIds,
    adGroupId: leadingDigits(url.searchParams.get('ad_group_id')),
    adId: leadingDigits(url.searchParams.get('ad_id')),
  }
}

/** Cláusulas extras para concatenar em um WHERE GAQL existente. IDs já sanitizados (dígitos). */
export function gaqlFilterClause(f: GoogleDimensionFilters): string {
  let out = ''
  if (f.campaignIds.length > 0) out += ` AND campaign.id IN (${f.campaignIds.join(', ')})`
  if (f.adGroupId) out += ` AND ad_group.id = ${f.adGroupId}`
  return out
}
