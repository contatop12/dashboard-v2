import { aggregateKeywordsByAdGroup } from './google-ads-keywords'
import { buildMetaTree, type MetaCampaignNode, type MetaNodeInput } from './meta-tree'

type GaqlRow = Record<string, unknown>

export function mapGoogleStatus(raw: unknown): string {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'ENABLED') return 'ACTIVE'
  return s || 'UNKNOWN'
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function str(v: unknown): string {
  return v != null ? String(v).trim() : ''
}

type NodeMetrics = {
  spend: number
  results: number
  ctrLink: number
  cpm: number
  impressions: number
  clicks: number
}

function zeroMetrics(): NodeMetrics {
  return { spend: 0, results: 0, ctrLink: 0, cpm: 0, impressions: 0, clicks: 0 }
}

/** Agrega métricas por id (linhas GAQL com segments podem repetir entidade). */
function metricsById(rows: GaqlRow[], idOf: (row: GaqlRow) => string): Map<string, NodeMetrics> {
  type Acc = { spend: number; impressions: number; clicks: number; conversions: number }
  const acc = new Map<string, Acc>()
  for (const row of rows) {
    const id = idOf(row)
    if (!id) continue
    const m = obj(obj(row).metrics)
    const cur = acc.get(id) ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    cur.spend += (Number.parseInt(String(m.costMicros ?? m.cost_micros ?? '0'), 10) || 0) / 1_000_000
    cur.impressions += Number.parseInt(String(m.impressions ?? '0'), 10) || 0
    cur.clicks += Number.parseInt(String(m.clicks ?? '0'), 10) || 0
    cur.conversions += Number.parseFloat(String(m.conversions ?? '0')) || 0
    acc.set(id, cur)
  }
  const out = new Map<string, NodeMetrics>()
  for (const [id, a] of acc) {
    out.set(id, {
      spend: a.spend,
      results: a.conversions,
      ctrLink: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
      cpm: a.impressions > 0 ? (a.spend / a.impressions) * 1000 : 0,
      impressions: a.impressions,
      clicks: a.clicks,
    })
  }
  return out
}

export function parseCampaignNodes(catalogRows: GaqlRow[], metricRows: GaqlRow[]): MetaNodeInput[] {
  const metrics = metricsById(metricRows, (r) => str(obj(obj(r).campaign).id))
  const seen = new Set<string>()
  const out: MetaNodeInput[] = []
  for (const row of catalogRows) {
    const c = obj(obj(row).campaign)
    const id = str(c.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: str(c.name) || `Campanha ${id}`,
      effectiveStatus: mapGoogleStatus(c.status),
      objective: str(c.advertisingChannelType ?? c.advertising_channel_type) || '—',
      dailyBudget: 0,
      parentId: null,
      metrics: metrics.get(id) ?? zeroMetrics(),
    })
  }
  return out
}

export function parseAdGroupNodes(catalogRows: GaqlRow[], metricRows: GaqlRow[]): MetaNodeInput[] {
  const metrics = metricsById(metricRows, (r) => {
    const R = obj(r)
    return str(obj(R.adGroup ?? R.ad_group).id)
  })
  const seen = new Set<string>()
  const out: MetaNodeInput[] = []
  for (const row of catalogRows) {
    const R = obj(row)
    const g = obj(R.adGroup ?? R.ad_group)
    const id = str(g.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: str(g.name) || `Grupo ${id}`,
      effectiveStatus: mapGoogleStatus(g.status),
      objective: '',
      dailyBudget: 0,
      parentId: str(obj(R.campaign).id) || null,
      metrics: metrics.get(id) ?? zeroMetrics(),
    })
  }
  return out
}

export function parseAdNodes(catalogRows: GaqlRow[], metricRows: GaqlRow[]): MetaNodeInput[] {
  const idOf = (r: GaqlRow) => {
    const R = obj(r)
    const aga = obj(R.adGroupAd ?? R.ad_group_ad)
    const adId = str(obj(aga.ad).id)
    const agId = str(obj(R.adGroup ?? R.ad_group).id)
    return adId && agId ? `${agId}~${adId}` : ''
  }
  const metrics = metricsById(metricRows, idOf)
  const seen = new Set<string>()
  const out: MetaNodeInput[] = []
  for (const row of catalogRows) {
    const R = obj(row)
    const aga = obj(R.adGroupAd ?? R.ad_group_ad)
    const ad = obj(aga.ad)
    const id = idOf(row)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: str(ad.name) || `Anúncio ${str(ad.id)}`,
      effectiveStatus: mapGoogleStatus(aga.status),
      objective: '',
      dailyBudget: 0,
      parentId: str(obj(R.adGroup ?? R.ad_group).id) || null,
      metrics: metrics.get(id) ?? zeroMetrics(),
    })
  }
  return out
}

export function buildGoogleTree(
  campaigns: MetaNodeInput[],
  adGroups: MetaNodeInput[],
  ads: MetaNodeInput[]
): MetaCampaignNode[] {
  return buildMetaTree(campaigns, adGroups, ads)
}

/** Anexa palavras-chave (Search) aos grupos de anúncios correspondentes. */
export function attachKeywordsToGoogleTree(
  tree: MetaCampaignNode[],
  keywordRows: GaqlRow[]
): MetaCampaignNode[] {
  const byAdGroup = aggregateKeywordsByAdGroup(keywordRows)
  return tree.map((campaign) => ({
    ...campaign,
    adsets: campaign.adsets.map((adset) => ({
      ...adset,
      keywords: byAdGroup.get(adset.id) ?? [],
    })),
  }))
}
