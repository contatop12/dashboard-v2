import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { conversionResultLabel } from '@/lib/metaMetricsConfig'

function pickConversions(raw, conversionId) {
  if (!raw) return 0
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
    case 'auto':
    case 'leads':
    default:
      return raw.leads ?? 0
  }
}

function pct(num, den) {
  if (!den || den <= 0) return null
  return (num / den) * 100
}

function deltaPct(primary, compare) {
  if (compare === 0) return primary === 0 ? 0 : null
  return ((primary - compare) / compare) * 100
}

export function buildMetaMetricsView(raw, compareRaw, conversionId, compareEnabled) {
  if (!raw) {
    return { primary: {}, secondary: {}, panels: { videoRetention: null, qualityRanking: null } }
  }

  const conversions = pickConversions(raw, conversionId)
  const compareConversions = compareRaw ? pickConversions(compareRaw, conversionId) : null
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
