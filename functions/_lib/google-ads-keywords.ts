type GaqlRow = Record<string, unknown>

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function str(v: unknown): string {
  return v != null ? String(v).trim() : ''
}

function num(v: unknown): number {
  const n = Number.parseFloat(String(v ?? '0'))
  return Number.isFinite(n) ? n : 0
}

function int(v: unknown): number {
  const n = Number.parseInt(String(v ?? '0'), 10)
  return Number.isFinite(n) ? n : 0
}

export type TopKeywordItem = {
  keyword: string
  matchType: string | null
  campaignId: string
  campaignName: string
  adGroupName: string | null
  spend: number
  impressions: number
  clicks: number
  conversions: number
  /** % (0–100) de impressões exibidas em 1º lugar absoluto, ponderado por impressões. */
  absTopPct: number | null
  /** % (0–100) de impressões no topo da página, ponderado por impressões. */
  topPct: number | null
  /** Estimativa de impressões em 1º lugar absoluto (impressões × %). */
  absTopImpressions: number
  costPerConversion: number | null
}

type KwAgg = {
  keyword: string
  matchType: string | null
  campaignId: string
  campaignName: string
  adGroupName: string | null
  costMicros: number
  impressions: number
  clicks: number
  conversions: number
  absTopWeighted: number
  topWeighted: number
  pctWeight: number
}

/**
 * Agrega linhas GAQL de keyword_view por (campanha, palavra-chave).
 * Percentuais (frações 0–1 na API) viram % 0–100 ponderados por impressões.
 */
export function aggregateTopKeywords(rows: GaqlRow[], limit = 20): TopKeywordItem[] {
  const byKey = new Map<string, KwAgg>()

  for (const row of rows) {
    const R = obj(row)
    const crit = obj(R.adGroupCriterion ?? R.ad_group_criterion)
    const kw = obj(crit.keyword)
    const text = str(kw.text)
    if (!text) continue
    const camp = obj(R.campaign)
    const campaignId = str(camp.id)
    const m = obj(R.metrics)

    const key = `${campaignId}~${text.toLowerCase()}`
    let a = byKey.get(key)
    if (!a) {
      a = {
        keyword: text,
        matchType: str(kw.matchType ?? kw.match_type) || null,
        campaignId,
        campaignName: str(camp.name) || `Campanha ${campaignId}`,
        adGroupName: str(obj(R.adGroup ?? R.ad_group).name) || null,
        costMicros: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        absTopWeighted: 0,
        topWeighted: 0,
        pctWeight: 0,
      }
      byKey.set(key, a)
    }

    const impressions = int(m.impressions)
    a.costMicros += int(m.costMicros ?? m.cost_micros)
    a.impressions += impressions
    a.clicks += int(m.clicks)
    a.conversions += num(m.conversions)

    // Proto3 omite zeros no JSON: campo ausente com impressões > 0 conta como 0%.
    const absTop = m.absoluteTopImpressionPercentage ?? m.absolute_top_impression_percentage
    const top = m.topImpressionPercentage ?? m.top_impression_percentage
    if (impressions > 0) {
      a.absTopWeighted += num(absTop) * impressions
      a.topWeighted += num(top) * impressions
      a.pctWeight += impressions
    }
  }

  const items: TopKeywordItem[] = []
  for (const a of byKey.values()) {
    if (a.impressions === 0 && a.clicks === 0 && a.costMicros === 0) continue
    const spend = a.costMicros / 1_000_000
    const absTopFrac = a.pctWeight > 0 ? a.absTopWeighted / a.pctWeight : null
    const topFrac = a.pctWeight > 0 ? a.topWeighted / a.pctWeight : null
    items.push({
      keyword: a.keyword,
      matchType: a.matchType,
      campaignId: a.campaignId,
      campaignName: a.campaignName,
      adGroupName: a.adGroupName,
      spend,
      impressions: a.impressions,
      clicks: a.clicks,
      conversions: a.conversions,
      absTopPct: absTopFrac != null ? absTopFrac * 100 : null,
      topPct: topFrac != null ? topFrac * 100 : null,
      absTopImpressions: absTopFrac != null ? Math.round(absTopFrac * a.impressions) : 0,
      costPerConversion: a.conversions > 0 ? spend / a.conversions : null,
    })
  }

  items.sort((x, y) => {
    if (y.spend !== x.spend) return y.spend - x.spend
    if (y.clicks !== x.clicks) return y.clicks - x.clicks
    if (y.impressions !== x.impressions) return y.impressions - x.impressions
    return x.keyword.localeCompare(y.keyword, 'pt')
  })

  return items.slice(0, limit)
}

export type TreeKeywordNode = {
  id: string
  keyword: string
  matchType: string | null
  metrics: {
    spend: number
    results: number
    impressions: number
    clicks: number
    ctrLink: number
    cpm: number
  }
}

type AdGroupKwAgg = {
  keyword: string
  matchType: string | null
  costMicros: number
  impressions: number
  clicks: number
  conversions: number
}

/**
 * Agrega keyword_view por grupo de anúncios + palavra-chave (para árvore de campanhas Search).
 */
export function aggregateKeywordsByAdGroup(rows: GaqlRow[]): Map<string, TreeKeywordNode[]> {
  const byAdGroup = new Map<string, Map<string, AdGroupKwAgg>>()

  for (const row of rows) {
    const R = obj(row)
    const crit = obj(R.adGroupCriterion ?? R.ad_group_criterion)
    const kw = obj(crit.keyword)
    const text = str(kw.text)
    if (!text) continue
    const adGroupId = str(obj(R.adGroup ?? R.ad_group).id)
    if (!adGroupId) continue
    const m = obj(R.metrics)

    const kwKey = `${text.toLowerCase()}~${str(kw.matchType ?? kw.match_type)}`
    let groupMap = byAdGroup.get(adGroupId)
    if (!groupMap) {
      groupMap = new Map()
      byAdGroup.set(adGroupId, groupMap)
    }
    let a = groupMap.get(kwKey)
    if (!a) {
      a = {
        keyword: text,
        matchType: str(kw.matchType ?? kw.match_type) || null,
        costMicros: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      }
      groupMap.set(kwKey, a)
    }

    a.costMicros += int(m.costMicros ?? m.cost_micros)
    a.impressions += int(m.impressions)
    a.clicks += int(m.clicks)
    a.conversions += num(m.conversions)
  }

  const out = new Map<string, TreeKeywordNode[]>()
  for (const [adGroupId, groupMap] of byAdGroup) {
    const items: TreeKeywordNode[] = []
    for (const a of groupMap.values()) {
      if (a.impressions === 0 && a.clicks === 0 && a.costMicros === 0) continue
      const spend = a.costMicros / 1_000_000
      items.push({
        id: `${adGroupId}~${a.keyword.toLowerCase()}`,
        keyword: a.keyword,
        matchType: a.matchType,
        metrics: {
          spend,
          results: a.conversions,
          impressions: a.impressions,
          clicks: a.clicks,
          ctrLink: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
          cpm: a.impressions > 0 ? (spend / a.impressions) * 1000 : 0,
        },
      })
    }
    items.sort((x, y) => {
      if (y.metrics.spend !== x.metrics.spend) return y.metrics.spend - x.metrics.spend
      if (y.metrics.clicks !== x.metrics.clicks) return y.metrics.clicks - x.metrics.clicks
      return x.keyword.localeCompare(y.keyword, 'pt')
    })
    if (items.length > 0) out.set(adGroupId, items)
  }
  return out
}

export type SearchTermItem = {
  term: string
  campaignName: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
}

type TermAgg = {
  term: string
  campaigns: Map<string, number>
  costMicros: number
  impressions: number
  clicks: number
  conversions: number
}

/** Agrega linhas GAQL de search_term_view por termo; campanha exibida = a de maior gasto. */
export function aggregateSearchTerms(rows: GaqlRow[], limit = 60): SearchTermItem[] {
  const byTerm = new Map<string, TermAgg>()

  for (const row of rows) {
    const R = obj(row)
    const stv = obj(R.searchTermView ?? R.search_term_view)
    const term = str(stv.searchTerm ?? stv.search_term)
    if (!term) continue
    const campaignName = str(obj(R.campaign).name)
    const m = obj(R.metrics)

    const key = term.toLowerCase()
    let a = byTerm.get(key)
    if (!a) {
      a = { term, campaigns: new Map(), costMicros: 0, impressions: 0, clicks: 0, conversions: 0 }
      byTerm.set(key, a)
    }

    const costMicros = int(m.costMicros ?? m.cost_micros)
    a.costMicros += costMicros
    a.impressions += int(m.impressions)
    a.clicks += int(m.clicks)
    a.conversions += num(m.conversions)
    if (campaignName) {
      a.campaigns.set(campaignName, (a.campaigns.get(campaignName) ?? 0) + costMicros)
    }
  }

  const items: SearchTermItem[] = []
  for (const a of byTerm.values()) {
    if (a.clicks === 0 && a.costMicros === 0 && a.conversions === 0) continue
    let campaignName = ''
    let best = -1
    for (const [name, cost] of a.campaigns) {
      if (cost > best) {
        best = cost
        campaignName = name
      }
    }
    items.push({
      term: a.term,
      campaignName,
      spend: a.costMicros / 1_000_000,
      impressions: a.impressions,
      clicks: a.clicks,
      conversions: a.conversions,
    })
  }

  items.sort((x, y) => {
    if (y.spend !== x.spend) return y.spend - x.spend
    if (y.conversions !== x.conversions) return y.conversions - x.conversions
    if (y.clicks !== x.clicks) return y.clicks - x.clicks
    return x.term.localeCompare(y.term, 'pt')
  })

  return items.slice(0, limit)
}
