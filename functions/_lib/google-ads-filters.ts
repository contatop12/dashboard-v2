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
  const adGroupFromParam = leadingDigits(url.searchParams.get('ad_group_id'))
  const adFromParam = parseGoogleAdIdParam(url.searchParams.get('ad_id'))
  return {
    campaignIds,
    adGroupId: adGroupFromParam ?? adFromParam.adGroupId,
    adId: adFromParam.adId,
  }
}

/** Suporta id composto `grupo~anuncio` usado na árvore do dashboard. */
function parseGoogleAdIdParam(raw: string | null): { adGroupId: string | null; adId: string | null } {
  const s = String(raw ?? '').trim()
  if (!s) return { adGroupId: null, adId: null }
  const sep = s.indexOf('~')
  if (sep > 0) {
    return {
      adGroupId: leadingDigits(s.slice(0, sep)),
      adId: leadingDigits(s.slice(sep + 1)),
    }
  }
  return { adGroupId: null, adId: leadingDigits(s) }
}

/** Cláusulas extras para concatenar em um WHERE GAQL existente. IDs já sanitizados (dígitos). */
export function gaqlFilterClause(f: GoogleDimensionFilters): string {
  let out = ''
  if (f.campaignIds.length > 0) out += ` AND campaign.id IN (${f.campaignIds.join(', ')})`
  if (f.adGroupId) out += ` AND ad_group.id = ${f.adGroupId}`
  if (f.adId) out += ` AND ad_group_ad.ad.id = ${f.adId}`
  return out
}
