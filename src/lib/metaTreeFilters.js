import { isErrorEffectiveStatus } from '@/lib/campaignStatus'

/** Filtra linhas de conjuntos (já achatadas) por status, objetivo e campanha. */
export function filterMetaAdsetRows(rows, filters) {
  if (!filters || typeof filters !== 'object') return rows
  let out = Array.isArray(rows) ? rows : []

  const objectiveCampaignIds = filters.objetivo?.campaignIds
  if (Array.isArray(objectiveCampaignIds) && objectiveCampaignIds.length) {
    const set = new Set(objectiveCampaignIds.map(String))
    out = out.filter((r) => set.has(String(r.campaignId)))
  }

  const campId = filters.campanha?.id
  if (campId) out = out.filter((r) => String(r.campaignId) === String(campId))

  const adsetId = filters.children?.id
  if (adsetId) out = out.filter((r) => String(r.id) === String(adsetId))

  const statusId = filters.status?.id
  if (statusId) {
    const want = String(statusId).toUpperCase()
    if (want === 'ERROR') {
      out = out.filter((r) => isErrorEffectiveStatus(r.effectiveStatus))
    } else {
      out = out.filter((r) => String(r.effectiveStatus ?? '').toUpperCase() === want)
    }
  }

  return out
}
