import {
  fillMonthlyGaps,
  lastNCalendarMonthsWindow,
  type MonthlyResultItem,
} from './google-ads-monthly'
import { fetchIgDailyInsights, type IgDailyRow } from './instagram-insights'

export type IgMonthlyResultsPayload = {
  items: MonthlyResultItem[]
  since: string | null
  until: string | null
  error: string | null
}

export const EMPTY_IG_MONTHLY_RESULTS: IgMonthlyResultsPayload = {
  items: [],
  since: null,
  until: null,
  error: null,
}

function rowsToIgMonthlyItems(daily: IgDailyRow[]): MonthlyResultItem[] {
  const map = new Map<
    string,
    { impressions: number; interactions: number; accountsEngaged: number; reach: number }
  >()
  for (const d of daily) {
    const date = String(d.date ?? '').trim()
    if (!date || date.length < 7) continue
    const monthKey = date.slice(0, 7)
    const cur = map.get(monthKey) ?? {
      impressions: 0,
      interactions: 0,
      accountsEngaged: 0,
      reach: 0,
    }
    cur.impressions += Math.round(Number(d.impressions) || 0)
    cur.interactions += Math.round(Number(d.interactions) || 0)
    cur.accountsEngaged += Math.round(Number(d.accountsEngaged) || 0)
    cur.reach += Math.round(Number(d.reach) || 0)
    map.set(monthKey, cur)
  }
  const items: MonthlyResultItem[] = []
  for (const [monthKey, a] of map) {
    if (a.impressions === 0 && a.interactions === 0 && a.accountsEngaged === 0 && a.reach === 0) continue
    items.push({
      monthKey,
      impressions: a.impressions,
      clicks: a.interactions,
      spend: 0,
      conversions: a.accountsEngaged,
      conversionsValue: a.reach,
    })
  }
  return items.sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

export async function fetchIgMonthlyResults(
  token: string,
  igId: string,
  untilYmd: string,
  months = 12
): Promise<IgMonthlyResultsPayload> {
  const { since, until: untilCap } = lastNCalendarMonthsWindow(untilYmd, months)
  try {
    const { daily, error } = await fetchIgDailyInsights(token, igId, since, untilCap)
    if (error && daily.length === 0) {
      return { items: [], since, until: untilCap, error }
    }
    const aggregated = rowsToIgMonthlyItems(daily)
    const items = fillMonthlyGaps(untilCap, aggregated, months)
    return { items, since, until: untilCap, error: error && aggregated.length === 0 ? error : null }
  } catch (e) {
    return {
      items: [],
      since,
      until: untilCap,
      error: e instanceof Error ? e.message : 'Erro ao buscar série mensal Instagram',
    }
  }
}
