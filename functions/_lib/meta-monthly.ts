import { parseLeadsFromRow } from './meta-conversions'
import {
  fillMonthlyGaps,
  lastNCalendarMonthsWindow,
  type MonthlyResultItem,
} from './google-ads-monthly'

export type MetaMonthlyResultsPayload = {
  items: MonthlyResultItem[]
  since: string | null
  until: string | null
  error: string | null
}

export const EMPTY_META_MONTHLY_RESULTS: MetaMonthlyResultsPayload = {
  items: [],
  since: null,
  until: null,
  error: null,
}

export function rowsToMetaMonthlyItems(rows: Record<string, unknown>[]): MonthlyResultItem[] {
  const items: MonthlyResultItem[] = []
  for (const row of rows) {
    const date = String(row.date_start ?? '').trim()
    if (!date || date.length < 7) continue
    const monthKey = date.slice(0, 7)
    const spend = Number.parseFloat(String(row.spend ?? 0)) || 0
    const impressions = Math.round(Number.parseFloat(String(row.impressions ?? 0)) || 0)
    const clicks = Math.round(Number.parseFloat(String(row.clicks ?? 0)) || 0)
    const conversions = parseLeadsFromRow(row)
    if (spend === 0 && impressions === 0 && clicks === 0 && conversions === 0) continue
    items.push({
      monthKey,
      impressions,
      clicks,
      spend,
      conversions,
      conversionsValue: 0,
    })
  }
  return items.sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

export async function fetchMetaMonthlyResults(
  token: string,
  actId: string,
  untilYmd: string,
  months = 12,
  filtering = ''
): Promise<MetaMonthlyResultsPayload> {
  const { since, until: untilCap } = lastNCalendarMonthsWindow(untilYmd, months)
  try {
    const fields = ['spend', 'impressions', 'clicks', 'actions', 'date_start'].join(',')
    const iu = new URL(`https://graph.facebook.com/v21.0/${actId}/insights`)
    iu.searchParams.set('fields', fields)
    iu.searchParams.set('time_range', JSON.stringify({ since, until: untilCap }))
    iu.searchParams.set('time_increment', 'monthly')
    iu.searchParams.set('access_token', token)
    const ir = await fetch(iu.toString() + filtering)
    const idata = (await ir.json()) as {
      data?: Record<string, unknown>[]
      error?: { message?: string }
    }
    if (!ir.ok || idata.error) {
      return {
        items: [],
        since,
        until: untilCap,
        error: idata.error?.message || 'Graph API insights mensais falhou',
      }
    }
    const aggregated = rowsToMetaMonthlyItems(idata.data ?? [])
    const items = fillMonthlyGaps(untilCap, aggregated, months)
    return { items, since, until: untilCap, error: null }
  } catch (e) {
    return {
      items: [],
      since,
      until: untilCap,
      error: e instanceof Error ? e.message : 'Falha na rede',
    }
  }
}
