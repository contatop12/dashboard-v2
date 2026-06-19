import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { conversionResultLabel } from '@/lib/metaMetricsConfig'

function pickConversions(raw, conversionId) {
  if (!raw) return 0
  const fromMap = raw.resultsByType?.[conversionId]
  if (fromMap != null && fromMap > 0) return Number(fromMap)
  switch (conversionId) {
    case 'purchases':
      return raw.purchases ?? 0
    case 'messages':
      return raw.messages ?? 0
    case 'post_engagement':
      return raw.postEngagement ?? 0
    case 'landing_page_view':
      return raw.lpViews ?? 0
    case 'link_click':
      return raw.linkClicks ?? 0
    case 'thruplay':
      return raw.thruPlay ?? 0
    case 'video_view':
      return raw.hookViews ?? 0
    case 'auto':
    case 'leads':
    default:
      return raw.leads ?? 0
  }
}

export function pickMetaResults(raw, conversionId) {
  if (!raw) return 0
  if (conversionId === 'auto') {
    const mapped = raw.resultsByType?.auto
    if (mapped != null && mapped > 0) return mapped
    if (raw.metaResults > 0) return raw.metaResults
    return raw.leads ?? 0
  }
  return pickConversions(raw, conversionId)
}

function pct(num, den) {
  if (!den || den <= 0) return null
  return (num / den) * 100
}

function deltaPct(primary, compare) {
  if (compare === 0) return primary === 0 ? 0 : null
  return ((primary - compare) / compare) * 100
}

/** Fallback no cliente quando a API não envia metaMetricsRaw mas há série diária. */
export function rawAggFromDaily(daily) {
  if (!Array.isArray(daily) || daily.length === 0) return null
  let spend = 0
  let impressions = 0
  let reach = 0
  let clicks = 0
  let leads = 0
  for (const d of daily) {
    spend += Number(d.spend) || 0
    impressions += Math.round(Number(d.impressions) || 0)
    reach += Math.round(Number(d.reach) || 0)
    clicks += Math.round(Number(d.clicks) || 0)
    leads += Math.round(Number(d.leads) || 0)
  }
  const linkClicks = clicks
  const ctr = impressions > 0 ? (linkClicks / impressions) * 100 : 0
  const cpc = linkClicks > 0 ? spend / linkClicks : 0
  const cpm = impressions > 0 ? spend / (impressions / 1000) : 0
  return {
    spend,
    impressions,
    reach,
    clicks,
    ctr,
    cpc,
    cpm,
    frequency: 0,
    leads,
    linkClicks,
    lpViews: 0,
    hookViews: 0,
    thruPlay: 0,
    purchases: 0,
    messages: 0,
    postEngagement: 0,
    metaResults: 0,
    conversionValue: 0,
    resultsByType: {},
    videoP25: 0,
    videoP50: 0,
    videoP75: 0,
    videoP100: 0,
  }
}

export function buildMetaMetricsView(raw, compareRaw, conversionId, compareEnabled) {
  if (!raw) {
    return { primary: {}, secondary: {}, panels: { videoRetention: null, qualityRanking: null } }
  }

  const conversions = pickMetaResults(raw, conversionId)
  const compareConversions = compareRaw ? pickMetaResults(compareRaw, conversionId) : null
  const resultLabel = conversionResultLabel(conversionId)
  const cpr = conversions > 0 ? raw.spend / conversions : null
  const compareCpr =
    compareConversions != null && compareConversions > 0 && compareRaw
      ? compareRaw.spend / compareConversions
      : null
  const convRate = pct(conversions, raw.impressions)
  const hookRate = pct(raw.hookViews, raw.impressions)
  const connectRate = pct(raw.lpViews, raw.linkClicks)
  const ctrAll = pct(raw.clicks, raw.impressions)
  const cpcAll = raw.clicks > 0 ? raw.spend / raw.clicks : null
  const roas = raw.spend > 0 && raw.conversionValue > 0 ? raw.conversionValue / raw.spend : null

  const d = (p, c) => (compareEnabled && compareRaw != null ? deltaPct(p, c) : null)

  return {
    primary: {
      invest: {
        value: formatCurrency(raw.spend),
        deltaPct: compareRaw ? d(raw.spend, compareRaw.spend) : null,
      },
      conversions: {
        value: formatNumber(conversions),
        hint: resultLabel,
        deltaPct: compareRaw ? d(conversions, compareConversions ?? 0) : null,
      },
      costPerResult: {
        value: cpr != null ? formatCurrency(cpr) : '—',
        hint: resultLabel,
        deltaPct:
          compareRaw && cpr != null && compareCpr != null ? d(cpr, compareCpr) : null,
      },
      conversionRate: {
        value: convRate != null ? formatPercent(convRate) : '—',
        hint: 'Impressão → resultado',
      },
      conversionValue: {
        value: raw.conversionValue > 0 ? formatCurrency(raw.conversionValue) : '—',
      },
      roas: {
        value: roas != null ? `${roas.toFixed(2)}x` : '—',
      },
    },
    secondary: {
      ctrLink: {
        value: formatPercent(raw.ctr),
        hint: 'Sem engajamento social',
        deltaPct: compareRaw ? d(raw.ctr, compareRaw.ctr) : null,
      },
      cpcLink: {
        value: formatCurrency(raw.cpc),
        deltaPct: compareRaw ? d(raw.cpc, compareRaw.cpc) : null,
      },
      cpm: {
        value: formatCurrency(raw.cpm),
        deltaPct: compareRaw ? d(raw.cpm, compareRaw.cpm) : null,
      },
      frequency: {
        value: raw.frequency.toFixed(2),
        hint: 'Saturação',
        deltaPct: compareRaw ? d(raw.frequency, compareRaw.frequency) : null,
      },
      reach: {
        value: formatNumber(raw.reach),
        deltaPct: compareRaw ? d(raw.reach, compareRaw.reach) : null,
      },
      hookRate: {
        value: hookRate != null ? formatPercent(hookRate) : '—',
        hint: '3s ÷ impressões',
      },
      thruPlay: {
        value: raw.thruPlay > 0 ? formatNumber(raw.thruPlay) : '—',
        deltaPct: compareRaw ? d(raw.thruPlay, compareRaw.thruPlay) : null,
      },
      connectRate: {
        value: connectRate != null ? formatPercent(connectRate) : '—',
        hint: 'LPV ÷ cliques no link',
      },
      impressions: { value: formatNumber(raw.impressions) },
      clicksAll: { value: formatNumber(raw.clicks) },
      ctrAll: { value: ctrAll != null ? formatPercent(ctrAll) : '—' },
      cpcAll: { value: cpcAll != null ? formatCurrency(cpcAll) : '—' },
      linkClicks: { value: formatNumber(raw.linkClicks) },
      lpViews: { value: raw.lpViews > 0 ? formatNumber(raw.lpViews) : '—' },
    },
    panels: {
      videoRetention: {
        p25: raw.videoP25,
        p50: raw.videoP50,
        p75: raw.videoP75,
        p100: raw.videoP100,
      },
      qualityRanking: null,
    },
  }
}
