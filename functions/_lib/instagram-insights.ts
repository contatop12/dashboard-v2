import { isIgPermissionError, igPermissionHelpMessage } from './instagram-permissions'

const MAX_RANGE_DAYS = 366

/** Métricas válidas em lotes (a API rejeita pedidos inválidos no lote inteiro). */
const IG_INSIGHT_METRIC_BATCHES = [
  ['reach', 'views', 'profile_views'],
  ['accounts_engaged', 'total_interactions'],
  ['likes', 'comments', 'saves', 'shares'],
] as const

export type IgDailyRow = {
  date: string
  reach: number
  impressions: number
  profileViews: number
  accountsEngaged: number
  likes: number
  comments: number
  saves: number
  shares: number
  interactions: number
  engagementRate: number
}

export type IgMetricsRaw = {
  reach: number
  impressions: number
  profileViews: number
  accountsEngaged: number
  likes: number
  comments: number
  saves: number
  shares: number
  interactions: number
  engagementRate: number
  followers: number
}

export type IgProfile = {
  id: string
  username: string
  name: string
  followers: number
  following: number
  mediaCount: number
}

export type IgPostRow = {
  id: string
  name: string
  caption: string
  mediaType: string
  productType: string
  tag: string
  tagBg: string
  tagColor: string
  mediaUrl: string | null
  thumbnailUrl: string | null
  permalink: string | null
  timestamp: string
  reach: number
  impressions: number
  likes: number
  comments: number
  saves: number
  shares: number
  interactions: number
  engagementRate: number
}

export type IgContentTypeRow = { name: string; value: number; color: string }

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export function daysBetweenInclusive(since: string, until: string): number {
  const a = new Date(since + 'T12:00:00Z').getTime()
  const b = new Date(until + 'T12:00:00Z').getTime()
  return Math.floor((b - a) / (86400 * 1000)) + 1
}

export function defaultLast30Ymd(): { since: string; until: string } {
  const u = new Date()
  const until = u.toISOString().slice(0, 10)
  const s = new Date(u)
  s.setUTCDate(s.getUTCDate() - 29)
  const since = s.toISOString().slice(0, 10)
  return { since, until }
}

export function parseIgRangeParams(url: URL): {
  since: string
  until: string
  compareSince: string | null
  compareUntil: string | null
} {
  const ds = url.searchParams.get('since')?.trim() ?? ''
  const du = url.searchParams.get('until')?.trim() ?? ''
  let since = isYmd(ds) ? ds : ''
  let until = isYmd(du) ? du : ''
  if (!since || !until) {
    const d = defaultLast30Ymd()
    since = d.since
    until = d.until
  }
  if (daysBetweenInclusive(since, until) > MAX_RANGE_DAYS) {
    const u = new Date(since + 'T12:00:00Z')
    u.setUTCDate(u.getUTCDate() + MAX_RANGE_DAYS - 1)
    until = u.toISOString().slice(0, 10)
  }
  const cs = url.searchParams.get('compare_since')?.trim() ?? ''
  const ct = url.searchParams.get('compare_until')?.trim() ?? ''
  const compareSince = isYmd(cs) ? cs : null
  const compareUntil = isYmd(ct) ? ct : null
  if (compareSince && compareUntil && daysBetweenInclusive(compareSince, compareUntil) > MAX_RANGE_DAYS) {
    return { since, until, compareSince: null, compareUntil: null }
  }
  return { since, until, compareSince, compareUntil }
}

function ymdToUnixStart(ymd: string): number {
  return Math.floor(new Date(ymd + 'T00:00:00Z').getTime() / 1000)
}

function ymdToUnixEndInclusive(ymd: string): number {
  return Math.floor(new Date(ymd + 'T23:59:59Z').getTime() / 1000)
}

function endTimeToYmd(endTime: string): string {
  return endTime.slice(0, 10)
}

function emptyDailyRow(date: string): IgDailyRow {
  return {
    date,
    reach: 0,
    impressions: 0,
    profileViews: 0,
    accountsEngaged: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    interactions: 0,
    engagementRate: 0,
  }
}

function engagementRateFrom(reach: number, interactions: number): number {
  if (!reach || reach <= 0) return 0
  return (interactions / reach) * 100
}

export function emptyIgRaw(followers = 0): IgMetricsRaw {
  return {
    reach: 0,
    impressions: 0,
    profileViews: 0,
    accountsEngaged: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    interactions: 0,
    engagementRate: 0,
    followers,
  }
}

export function aggregateIgRawFromDaily(daily: IgDailyRow[], followers = 0): IgMetricsRaw | null {
  if (!daily.length) return null
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
    engagementRate: engagementRateFrom(reach, interactions),
    followers,
  }
}

function fillDailyGaps(since: string, until: string, rows: IgDailyRow[]): IgDailyRow[] {
  const map = new Map(rows.map((r) => [r.date, r]))
  const out: IgDailyRow[] = []
  const cur = new Date(since + 'T12:00:00Z')
  const end = new Date(until + 'T12:00:00Z')
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10)
    out.push(map.get(d) ?? emptyDailyRow(d))
    cur.setUTCDate(cur.getUTCDate() + 1)
    if (daysBetweenInclusive(since, d) > MAX_RANGE_DAYS) break
  }
  return out
}

type InsightApiRow = { name?: string; values?: { value?: number; end_time?: string }[] }

function parseDailyInsightsResponse(data: InsightApiRow[] | undefined): IgDailyRow[] {
  const byDate = new Map<string, IgDailyRow>()
  for (const metric of data ?? []) {
    const name = String(metric.name ?? '')
    for (const v of metric.values ?? []) {
      const endTime = String(v.end_time ?? '')
      if (!endTime) continue
      const date = endTimeToYmd(endTime)
      const row = byDate.get(date) ?? emptyDailyRow(date)
      const val = Math.round(Number(v.value) || 0)
      switch (name) {
        case 'reach':
          row.reach = val
          break
        case 'impressions':
        case 'views':
          row.impressions = val
          break
        case 'profile_views':
          row.profileViews = val
          break
        case 'accounts_engaged':
          row.accountsEngaged = val
          break
        case 'likes':
          row.likes = val
          break
        case 'comments':
          row.comments = val
          break
        case 'saves':
          row.saves = val
          break
        case 'shares':
          row.shares = val
          break
        case 'total_interactions':
          row.interactions = val
          break
        default:
          break
      }
      byDate.set(date, row)
    }
  }
  for (const row of byDate.values()) {
    if (row.interactions === 0) {
      row.interactions = row.likes + row.comments + row.saves + row.shares
    }
    row.engagementRate = engagementRateFrom(row.reach, row.interactions)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchIgProfile(token: string, igId: string): Promise<IgProfile | null> {
  const u = new URL(`https://graph.facebook.com/v21.0/${igId}`)
  u.searchParams.set('fields', 'username,followers_count,follows_count,media_count,name')
  u.searchParams.set('access_token', token)
  const r = await fetch(u.toString())
  const j = (await r.json()) as {
    username?: string
    followers_count?: number
    follows_count?: number
    media_count?: number
    name?: string
    error?: { message?: string }
  }
  if (!r.ok || j.error) return null
  return {
    id: igId,
    username: String(j.username ?? '').trim(),
    name: String(j.name ?? j.username ?? '').trim(),
    followers: Math.round(Number(j.followers_count) || 0),
    following: Math.round(Number(j.follows_count) || 0),
    mediaCount: Math.round(Number(j.media_count) || 0),
  }
}

export async function fetchIgDailyInsights(
  token: string,
  igId: string,
  since: string,
  until: string
): Promise<{
  daily: IgDailyRow[]
  error: string | null
  permissionDenied: boolean
  hasInsightData: boolean
}> {
  const sinceUnix = String(ymdToUnixStart(since))
  const untilUnix = String(ymdToUnixEndInclusive(until))
  const merged: InsightApiRow[] = []
  const errors: string[] = []
  let permissionDenied = false

  try {
    for (const batch of IG_INSIGHT_METRIC_BATCHES) {
      const u = new URL(`https://graph.facebook.com/v21.0/${igId}/insights`)
      u.searchParams.set('metric', batch.join(','))
      u.searchParams.set('period', 'day')
      u.searchParams.set('since', sinceUnix)
      u.searchParams.set('until', untilUnix)
      u.searchParams.set('access_token', token)
      const r = await fetch(u.toString())
      const j = (await r.json()) as { data?: InsightApiRow[]; error?: { message?: string } }
      if (!r.ok || j.error) {
        const msg = j.error?.message || 'Insights diários do Instagram falharam'
        errors.push(msg)
        if (isIgPermissionError(msg)) permissionDenied = true
        continue
      }
      merged.push(...(j.data ?? []))
    }

    const parsed = parseDailyInsightsResponse(merged)
    const hasInsightData = parsed.some(
      (d) =>
        d.reach > 0 ||
        d.impressions > 0 ||
        d.interactions > 0 ||
        d.accountsEngaged > 0 ||
        d.likes > 0 ||
        d.comments > 0
    )

    if (!hasInsightData && errors.length > 0) {
      const primary = errors[0] ?? 'Insights indisponíveis'
      return {
        daily: [],
        error: permissionDenied ? igPermissionHelpMessage() : primary,
        permissionDenied,
        hasInsightData: false,
      }
    }

    return {
      daily: fillDailyGaps(since, until, parsed),
      error: errors.length > 0 && !hasInsightData ? errors[0] : null,
      permissionDenied,
      hasInsightData,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar insights diários'
    return {
      daily: [],
      error: isIgPermissionError(msg) ? igPermissionHelpMessage() : msg,
      permissionDenied: isIgPermissionError(msg),
      hasInsightData: false,
    }
  }
}

const CONTENT_TYPE_COLORS: Record<string, string> = {
  Reels: '#FF6B6B',
  Feed: '#F5C518',
  Stories: '#9B8EFF',
  Carrossel: '#4A9BFF',
  Outros: '#64748b',
}

function mapContentLabel(mediaType: string, productType: string): { tag: string; bucket: string } {
  const mt = mediaType.toUpperCase()
  const pt = productType.toUpperCase()
  if (pt === 'REELS' || (mt === 'VIDEO' && pt === 'REELS')) {
    return { tag: 'Reel', bucket: 'Reels' }
  }
  if (pt === 'STORY' || pt === 'STORIES') {
    return { tag: 'Stories', bucket: 'Stories' }
  }
  if (mt === 'CAROUSEL_ALBUM') {
    return { tag: 'Carrossel', bucket: 'Carrossel' }
  }
  if (mt === 'IMAGE') {
    return { tag: 'Feed', bucket: 'Feed' }
  }
  if (mt === 'VIDEO') {
    return { tag: 'Reel', bucket: 'Reels' }
  }
  return { tag: 'Post', bucket: 'Outros' }
}

function captionPreview(caption: string, max = 72): string {
  const t = caption.replace(/\s+/g, ' ').trim()
  if (!t) return 'Publicação sem legenda'
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

function inDateRange(timestamp: string, since: string, until: string): boolean {
  const d = timestamp.slice(0, 10)
  return d >= since && d <= until
}

type MediaApiRow = {
  id?: string
  caption?: string
  media_type?: string
  media_product_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
  like_count?: number
  comments_count?: number
}

async function fetchMediaInsights(
  token: string,
  mediaId: string
): Promise<{ reach: number; impressions: number; saves: number; shares: number; interactions: number }> {
  const u = new URL(`https://graph.facebook.com/v21.0/${mediaId}/insights`)
  u.searchParams.set('metric', 'reach,impressions,saved,shares,total_interactions')
  u.searchParams.set('access_token', token)
  const r = await fetch(u.toString())
  const j = (await r.json()) as { data?: { name?: string; values?: { value?: number }[] }[] }
  let reach = 0
  let impressions = 0
  let saves = 0
  let shares = 0
  let interactions = 0
  for (const row of j.data ?? []) {
    const val = Math.round(Number(row.values?.[0]?.value) || 0)
    switch (row.name) {
      case 'reach':
        reach = val
        break
      case 'impressions':
        impressions = val
        break
      case 'saved':
        saves = val
        break
      case 'shares':
        shares = val
        break
      case 'total_interactions':
        interactions = val
        break
      default:
        break
    }
  }
  if (interactions === 0) interactions = saves + shares
  return { reach, impressions, saves, shares, interactions }
}

export async function fetchIgPostsAndContent(
  token: string,
  igId: string,
  since: string,
  until: string
): Promise<{ posts: IgPostRow[]; contentTypes: IgContentTypeRow[]; error: string | null }> {
  try {
    const u = new URL(`https://graph.facebook.com/v21.0/${igId}/media`)
    u.searchParams.set(
      'fields',
      'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'
    )
    u.searchParams.set('limit', '50')
    u.searchParams.set('access_token', token)

    const mediaRows: MediaApiRow[] = []
    let url: string | null = u.toString()
    for (let page = 0; page < 5 && url; page++) {
      const r = await fetch(url)
      const j = (await r.json()) as {
        data?: MediaApiRow[]
        paging?: { next?: string }
        error?: { message?: string }
      }
      if (!r.ok || j.error) {
        const msg = j.error?.message || 'Falha ao listar mídias'
        return {
          posts: [],
          contentTypes: [],
          error: isIgPermissionError(msg) ? igPermissionHelpMessage() : msg,
        }
      }
      mediaRows.push(...(j.data ?? []))
      url = j.paging?.next ?? null
    }

    const inRange = mediaRows.filter((m) => m.timestamp && inDateRange(m.timestamp, since, until))
    const bucketCounts = new Map<string, number>()
    for (const m of inRange) {
      const { bucket } = mapContentLabel(String(m.media_type ?? ''), String(m.media_product_type ?? ''))
      bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1)
    }
    const totalPosts = inRange.length || 1
    const contentTypes: IgContentTypeRow[] = [...bucketCounts.entries()]
      .map(([name, count]) => ({
        name,
        value: Math.round((count / totalPosts) * 1000) / 10,
        color: CONTENT_TYPE_COLORS[name] ?? CONTENT_TYPE_COLORS.Outros,
      }))
      .sort((a, b) => b.value - a.value)

    const enriched: IgPostRow[] = []
    const slice = inRange.slice(0, 24)
    for (const m of slice) {
      const mediaType = String(m.media_type ?? '')
      const productType = String(m.media_product_type ?? '')
      const { tag, bucket } = mapContentLabel(mediaType, productType)
      const color = CONTENT_TYPE_COLORS[bucket] ?? CONTENT_TYPE_COLORS.Outros
      const likes = Math.round(Number(m.like_count) || 0)
      const comments = Math.round(Number(m.comments_count) || 0)
      let reach = 0
      let impressions = 0
      let saves = 0
      let shares = 0
      let interactions = likes + comments
      if (m.id) {
        const ins = await fetchMediaInsights(token, m.id)
        reach = ins.reach
        impressions = ins.impressions
        saves = ins.saves
        shares = ins.shares
        interactions = ins.interactions || likes + comments + saves + shares
      }
      const caption = String(m.caption ?? '')
      enriched.push({
        id: String(m.id ?? ''),
        name: captionPreview(caption),
        caption,
        mediaType,
        productType,
        tag,
        tagBg: `${color}25`,
        tagColor: color,
        mediaUrl: m.media_url ?? null,
        thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
        permalink: m.permalink ?? null,
        timestamp: String(m.timestamp ?? ''),
        reach,
        impressions,
        likes,
        comments,
        saves,
        shares,
        interactions,
        engagementRate: engagementRateFrom(reach || impressions, interactions),
      })
    }

    enriched.sort((a, b) => b.engagementRate - a.engagementRate || b.reach - a.reach)
    return { posts: enriched, contentTypes, error: null }
  } catch (e) {
    return {
      posts: [],
      contentTypes: [],
      error: e instanceof Error ? e.message : 'Erro ao buscar publicações',
    }
  }
}

export function igDisplayName(profile: IgProfile | null, fallbackId: string): string {
  if (profile?.username) return `@${profile.username}`
  if (profile?.name) return profile.name
  return fallbackId ? `IG ${fallbackId}` : 'Instagram'
}
