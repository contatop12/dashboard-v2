export type MetaDimensionFilters = {
  campaignIds: string[]
  adsetId: string | null
  adId: string | null
}

function sanitizeId(v: string | null | undefined): string | null {
  const s = String(v ?? '').trim()
  return /^\d+$/.test(s) ? s : null
}

export function parseMetaDimensionFilters(url: URL): MetaDimensionFilters {
  const rawIds = url.searchParams.get('campaign_ids')?.split(',') ?? []
  return {
    campaignIds: rawIds.map(sanitizeId).filter((s): s is string => s != null),
    adsetId: sanitizeId(url.searchParams.get('adset_id')),
    adId: sanitizeId(url.searchParams.get('ad_id')),
  }
}

/** Sufixo `&filtering=[...]` para URLs de insights da Graph API. Vazio sem filtros. */
export function metaFilteringQuery(f: MetaDimensionFilters): string {
  const rules: { field: string; operator: 'IN'; values: string[] }[] = []
  if (f.campaignIds.length) rules.push({ field: 'campaign.id', operator: 'IN', values: f.campaignIds })
  if (f.adsetId) rules.push({ field: 'adset.id', operator: 'IN', values: [f.adsetId] })
  if (f.adId) rules.push({ field: 'ad.id', operator: 'IN', values: [f.adId] })
  if (!rules.length) return ''
  return `&filtering=${encodeURIComponent(JSON.stringify(rules))}`
}
