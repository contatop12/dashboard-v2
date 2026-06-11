type GaqlRow = Record<string, unknown>

export type MonthlyResultItem = {
  monthKey: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  conversionsValue: number
}

/**
 * Janela dos últimos N meses civis inclusive, terminando em `untilYmd`.
 * Ex.: until=2026-06-11, n=6 → since=2026-01-01, until=2026-06-11.
 */
export function lastNCalendarMonthsWindow(untilYmd: string, n = 6): { since: string; until: string } {
  const parts = untilYmd.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const end = new Date(Date.UTC(y, m - 1, d))
  const start = new Date(Date.UTC(y, m - 1, 1))
  start.setUTCMonth(start.getUTCMonth() - (Math.max(1, n) - 1))
  const since = start.toISOString().slice(0, 10)
  return { since, until: end.toISOString().slice(0, 10) }
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function monthKeyFromSegment(raw: unknown): string | null {
  const s = raw != null ? String(raw).trim() : ''
  if (!s || s.length < 7) return null
  return s.slice(0, 7)
}

/**
 * Agrega linhas GAQL com segments.month em buckets mensais (YYYY-MM).
 */
export function aggregateGoogleMonthlyRows(rows: GaqlRow[]): MonthlyResultItem[] {
  const byMonth = new Map<
    string,
    { impressions: number; clicks: number; costMicros: number; conversions: number; conversionsValue: number }
  >()

  for (const row of rows) {
    const seg = obj(row.segments)
    const monthKey = monthKeyFromSegment(seg.month ?? seg.date)
    if (!monthKey) continue
    const m = obj(row.metrics)
    const cur = byMonth.get(monthKey) ?? {
      impressions: 0,
      clicks: 0,
      costMicros: 0,
      conversions: 0,
      conversionsValue: 0,
    }
    cur.impressions += Number.parseInt(String(m.impressions ?? '0'), 10) || 0
    cur.clicks += Number.parseInt(String(m.clicks ?? '0'), 10) || 0
    cur.costMicros += Number.parseInt(String(m.costMicros ?? m.cost_micros ?? '0'), 10) || 0
    cur.conversions += Number.parseFloat(String(m.conversions ?? '0')) || 0
    cur.conversionsValue += Number.parseFloat(String(m.conversionsValue ?? m.conversions_value ?? '0')) || 0
    byMonth.set(monthKey, cur)
  }

  const items: MonthlyResultItem[] = []
  for (const [monthKey, a] of byMonth) {
    if (a.impressions === 0 && a.clicks === 0 && a.costMicros === 0 && a.conversions === 0) continue
    items.push({
      monthKey,
      impressions: a.impressions,
      clicks: a.clicks,
      spend: a.costMicros / 1_000_000,
      conversions: a.conversions,
      conversionsValue: a.conversionsValue,
    })
  }

  items.sort((a, b) => b.monthKey.localeCompare(a.monthKey))
  return items
}

/** Preenche meses vazios na janela (últimos N meses) com zeros. */
export function fillMonthlyGaps(
  untilYmd: string,
  items: MonthlyResultItem[],
  n = 6
): MonthlyResultItem[] {
  const map = new Map(items.map((i) => [i.monthKey, i]))
  const { since } = lastNCalendarMonthsWindow(untilYmd, n)
  let y = Number(since.slice(0, 4))
  let m = Number(since.slice(5, 7))
  const endY = Number(untilYmd.slice(0, 4))
  const endM = Number(untilYmd.slice(5, 7))
  const out: MonthlyResultItem[] = []

  while (y < endY || (y === endY && m <= endM)) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    out.push(
      map.get(key) ?? {
        monthKey: key,
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        conversionsValue: 0,
      }
    )
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }

  return out.sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}
