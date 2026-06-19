export type MetaMetrics = {
  spend: number
  results: number
  ctrLink: number
  cpm: number
  impressions?: number
  clicks?: number
  [k: string]: number | undefined
}

export type MetaKeywordNode = {
  id: string
  keyword: string
  matchType: string | null
  metrics: MetaMetrics
}

export type MetaNodeInput = {
  id: string
  name: string
  effectiveStatus: string
  objective: string
  dailyBudget: number
  parentId: string | null
  thumbnailUrl?: string | null
  mediaType?: 'video' | 'image'
  imageUrl?: string | null
  metrics: MetaMetrics
}

export type MetaAdNode = MetaNodeInput
export type MetaAdsetNode = MetaNodeInput & { ads: MetaAdNode[]; keywords?: MetaKeywordNode[] }
export type MetaCampaignNode = MetaNodeInput & { adsets: MetaAdsetNode[] }

/** Assemble Campaign → AdSet → Ad. Orphans (missing parent) are dropped. */
export function buildMetaTree(
  campaigns: MetaNodeInput[],
  adsets: MetaNodeInput[],
  ads: MetaNodeInput[]
): MetaCampaignNode[] {
  const adsByAdset = new Map<string, MetaAdNode[]>()
  for (const ad of ads) {
    if (!ad.parentId) continue
    const list = adsByAdset.get(ad.parentId) ?? []
    list.push(ad)
    adsByAdset.set(ad.parentId, list)
  }

  const adsetsByCampaign = new Map<string, MetaAdsetNode[]>()
  for (const set of adsets) {
    if (!set.parentId) continue
    const node: MetaAdsetNode = { ...set, ads: adsByAdset.get(set.id) ?? [] }
    const list = adsetsByCampaign.get(set.parentId) ?? []
    list.push(node)
    adsetsByCampaign.set(set.parentId, list)
  }

  return campaigns.map((c) => ({ ...c, adsets: adsetsByCampaign.get(c.id) ?? [] }))
}
