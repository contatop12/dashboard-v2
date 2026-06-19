import { formatNumber, formatPercent } from '@/lib/utils'

function deltaPct(primary, compare) {
  if (compare === 0) return primary === 0 ? 0 : null
  return ((primary - compare) / compare) * 100
}

/** Fallback no cliente quando a API não envia igMetricsRaw mas há série diária. */
export function rawAggFromIgDaily(daily, followers = 0) {
  if (!Array.isArray(daily) || daily.length === 0) return null
  let reach = 0
  let impressions = 0
  let profileViews = 0
  let accountsEngaged = 0
  let likes = 0
  let comments = 0
  let saves = 0
  let shares = 0
  let interactions = 0
  for (const d of daily) {
    reach += Math.round(Number(d.reach) || 0)
    impressions += Math.round(Number(d.impressions) || 0)
    profileViews += Math.round(Number(d.profileViews) || 0)
    accountsEngaged += Math.round(Number(d.accountsEngaged) || 0)
    likes += Math.round(Number(d.likes) || 0)
    comments += Math.round(Number(d.comments) || 0)
    saves += Math.round(Number(d.saves) || 0)
    shares += Math.round(Number(d.shares) || 0)
    interactions += Math.round(Number(d.interactions) || 0)
  }
  if (interactions === 0) interactions = likes + comments + saves + shares
  const engagementRate = reach > 0 ? (interactions / reach) * 100 : 0
  return {
    reach,
    impressions,
    profileViews,
    accountsEngaged,
    likes,
    comments,
    saves,
    shares,
    interactions,
    engagementRate,
    followers,
  }
}

export function buildInstagramMetricsView(raw, compareRaw, compareEnabled) {
  if (!raw) {
    return { primary: {}, secondary: {} }
  }

  const d = (p, c) => (compareEnabled && compareRaw != null ? deltaPct(p, c) : null)

  return {
    primary: {
      reach: {
        value: formatNumber(Math.round(raw.reach)),
        deltaPct: compareRaw ? d(raw.reach, compareRaw.reach) : null,
      },
      accountsEngaged: {
        value: formatNumber(Math.round(raw.accountsEngaged)),
        deltaPct: compareRaw ? d(raw.accountsEngaged, compareRaw.accountsEngaged) : null,
      },
      engagementRate: {
        value: formatPercent(raw.engagementRate),
        hint: 'Interações / alcance',
        deltaPct: compareRaw ? d(raw.engagementRate, compareRaw.engagementRate) : null,
      },
      impressions: {
        value: formatNumber(Math.round(raw.impressions)),
        deltaPct: compareRaw ? d(raw.impressions, compareRaw.impressions) : null,
      },
    },
    secondary: {
      likes: {
        value: formatNumber(Math.round(raw.likes)),
        deltaPct: compareRaw ? d(raw.likes, compareRaw.likes) : null,
      },
      comments: {
        value: formatNumber(Math.round(raw.comments)),
        deltaPct: compareRaw ? d(raw.comments, compareRaw.comments) : null,
      },
      saves: {
        value: formatNumber(Math.round(raw.saves)),
        deltaPct: compareRaw ? d(raw.saves, compareRaw.saves) : null,
      },
      shares: {
        value: formatNumber(Math.round(raw.shares)),
        deltaPct: compareRaw ? d(raw.shares, compareRaw.shares) : null,
      },
    },
  }
}
