export type MetaCreativeFields = {
  thumbnail_url?: string
  image_url?: string
  object_type?: string
  video_id?: string
  image_hash?: string
  object_story_spec?: {
    link_data?: { picture?: string; image_hash?: string }
    video_data?: { image_url?: string; video_id?: string; picture?: string }
  }
}

export type CreativeQualityMode = 'compact' | 'balanced' | 'high'

export type CreativePreview = {
  mediaType: 'video' | 'image'
  thumbnailUrl: string | null
  imageUrl: string | null
  /** Melhor URL disponível (adimages, object_story_spec, vídeo em alta). */
  highResUrl: string | null
  /** URL legado para cards que ainda usam um único campo. */
  previewUrl: string | null
}

export type CreativeMediaExtras = {
  adImageByHash?: Map<string, string>
  videoPictureById?: Map<string, string>
}

function trimUrl(value: string | undefined): string | null {
  const v = value?.trim()
  return v || null
}

function firstUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    const v = trimUrl(c ?? undefined)
    if (v) return v
  }
  return null
}

export function isVideoCreative(creative?: MetaCreativeFields | null): boolean {
  if (!creative) return false
  if (creative.video_id?.trim()) return true
  const videoDataId = creative.object_story_spec?.video_data?.video_id?.trim()
  if (videoDataId) return true
  const type = String(creative.object_type ?? '').toUpperCase()
  return type === 'VIDEO' || type === 'VIDEO_LISTING'
}

export function collectCreativeMediaRefs(
  creatives: Array<MetaCreativeFields | null | undefined>
): { imageHashes: string[]; videoIds: string[] } {
  const hashes = new Set<string>()
  const videoIds = new Set<string>()
  for (const creative of creatives) {
    if (!creative) continue
    const hash =
      trimUrl(creative.image_hash) ?? trimUrl(creative.object_story_spec?.link_data?.image_hash)
    if (hash) hashes.add(hash)
    const videoId =
      trimUrl(creative.video_id) ?? trimUrl(creative.object_story_spec?.video_data?.video_id)
    if (videoId) videoIds.add(videoId)
  }
  return { imageHashes: [...hashes], videoIds: [...videoIds] }
}

export function pickBestVideoPicture(data: {
  picture?: string
  thumbnails?: { data?: Array<{ uri?: string; width?: number }> }
}): string | null {
  const thumbs = data.thumbnails?.data
  if (Array.isArray(thumbs) && thumbs.length) {
    let best = thumbs[0]
    for (const t of thumbs) {
      if ((t.width ?? 0) > (best.width ?? 0)) best = t
    }
    const uri = trimUrl(best.uri)
    if (uri) return uri
  }
  return trimUrl(data.picture)
}

export async function fetchAdImageUrls(
  token: string,
  actId: string,
  hashes: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!hashes.length) return map
  const chunk = 40
  for (let i = 0; i < hashes.length; i += chunk) {
    const slice = hashes.slice(i, i + chunk)
    const u = new URL(`https://graph.facebook.com/v21.0/act_${actId}/adimages`)
    u.searchParams.set('hashes', JSON.stringify(slice))
    u.searchParams.set('fields', 'hash,url,permalink_url')
    u.searchParams.set('access_token', token)
    const r = await fetch(u.toString())
    const j = (await r.json()) as {
      data?: Array<{ hash?: string; url?: string; permalink_url?: string }>
      error?: { message?: string }
    }
    if (j.error) continue
    for (const row of j.data ?? []) {
      const hash = trimUrl(row.hash)
      const url = firstUrl(row.url, row.permalink_url)
      if (hash && url) map.set(hash, url)
    }
  }
  return map
}

export async function fetchVideoPictureUrls(
  token: string,
  videoIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!videoIds.length) return map
  const chunk = 45
  for (let i = 0; i < videoIds.length; i += chunk) {
    const slice = videoIds.slice(i, i + chunk)
    const u = new URL('https://graph.facebook.com/v21.0/')
    u.searchParams.set('ids', slice.join(','))
    u.searchParams.set('fields', 'picture,thumbnails{uri,width,height}')
    u.searchParams.set('access_token', token)
    const r = await fetch(u.toString())
    const j = (await r.json()) as Record<
      string,
      { picture?: string; thumbnails?: { data?: Array<{ uri?: string; width?: number }> } } | { error?: unknown }
    >
    for (const id of slice) {
      const o = j[id]
      if (!o || typeof o !== 'object' || 'error' in o) continue
      const url = pickBestVideoPicture(o)
      if (url) map.set(id, url)
    }
  }
  return map
}

export async function buildCreativeMediaExtras(
  token: string,
  actId: string,
  creatives: Array<MetaCreativeFields | null | undefined>
): Promise<CreativeMediaExtras> {
  const { imageHashes, videoIds } = collectCreativeMediaRefs(creatives)
  const [adImageByHash, videoPictureById] = await Promise.all([
    fetchAdImageUrls(token, actId, imageHashes),
    fetchVideoPictureUrls(token, videoIds),
  ])
  return { adImageByHash, videoPictureById }
}

function resolveCreativeHash(creative?: MetaCreativeFields | null): string | null {
  return (
    trimUrl(creative?.image_hash) ?? trimUrl(creative?.object_story_spec?.link_data?.image_hash)
  )
}

function resolveCreativeVideoId(creative?: MetaCreativeFields | null): string | null {
  return (
    trimUrl(creative?.video_id) ?? trimUrl(creative?.object_story_spec?.video_data?.video_id)
  )
}

export function resolveCreativePreview(
  creative?: MetaCreativeFields | null,
  extras?: CreativeMediaExtras
): CreativePreview {
  const thumbnailUrl = trimUrl(creative?.thumbnail_url)
  const imageUrl = trimUrl(creative?.image_url)
  const linkPicture = trimUrl(creative?.object_story_spec?.link_data?.picture)
  const videoDataImage = trimUrl(creative?.object_story_spec?.video_data?.image_url)
  const videoDataPicture = trimUrl(creative?.object_story_spec?.video_data?.picture)

  const hash = resolveCreativeHash(creative)
  const adImageUrl = hash ? extras?.adImageByHash?.get(hash) ?? null : null

  const videoId = resolveCreativeVideoId(creative)
  const videoPictureUrl = videoId ? extras?.videoPictureById?.get(videoId) ?? null : null

  const highResUrl = firstUrl(
    adImageUrl,
    linkPicture,
    videoDataPicture,
    videoDataImage,
    videoPictureUrl,
    imageUrl,
    thumbnailUrl
  )

  if (isVideoCreative(creative)) {
    const standardUrl = firstUrl(thumbnailUrl, videoDataImage, imageUrl)
    const highRes = firstUrl(videoPictureUrl, videoDataPicture, videoDataImage, imageUrl, thumbnailUrl)
    return {
      mediaType: 'video',
      thumbnailUrl: thumbnailUrl || standardUrl,
      imageUrl: null,
      highResUrl: highRes,
      previewUrl: standardUrl,
    }
  }

  const standardUrl = firstUrl(imageUrl, linkPicture, thumbnailUrl)
  return {
    mediaType: 'image',
    thumbnailUrl,
    imageUrl: standardUrl,
    highResUrl: firstUrl(adImageUrl, linkPicture, imageUrl, thumbnailUrl),
    previewUrl: standardUrl,
  }
}

export function resolveCreativeDisplayUrl(
  preview: CreativePreview,
  mode: CreativeQualityMode = 'balanced'
): string | null {
  switch (mode) {
    case 'compact':
      return preview.thumbnailUrl || preview.imageUrl || preview.highResUrl || preview.previewUrl
    case 'high':
      return (
        preview.highResUrl ||
        preview.imageUrl ||
        preview.thumbnailUrl ||
        preview.previewUrl
      )
    case 'balanced':
    default:
      return (
        preview.imageUrl ||
        preview.previewUrl ||
        preview.highResUrl ||
        preview.thumbnailUrl
      )
  }
}
