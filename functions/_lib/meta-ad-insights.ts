export type MetaAdInsightRow = {
  ad_id: string
  ad_name: string
  adset_id: string
  spend: number
  leads: number
  impressions: number
  linkClicks: number
}

/** Ordena por investimento; `limit` só deve ser usado no carrossel de criativos, não na árvore. */
export function sortMetaAdInsightRows(rows: MetaAdInsightRow[], limit?: number): MetaAdInsightRow[] {
  const sorted = [...rows].sort((a, b) => b.spend - a.spend || b.impressions - a.impressions)
  if (limit != null && limit > 0) return sorted.slice(0, limit)
  return sorted
}
