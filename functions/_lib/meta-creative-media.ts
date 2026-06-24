export type MetaCreativeFields = {
  id?: string
  thumbnail_url?: string
  image_url?: string
  object_type?: string
  video_id?: string
}

/** Estilos nativos de preview da Meta: miniatura pequena vs. formato mobile. */
export type MetaCreativePreviewStyle = 'thumb' | 'phone'

export type CreativePreview = {
  mediaType: 'video' | 'image'
  thumbnailUrl: string | null
  imageUrl: string | null
  /** Thumbnail renderizado em dimensões mobile (thumbnail_width/height na API). */
  phoneUrl: string | null
  /** URL legado para cards que ainda usam um único campo. */
  previewUrl: string | null
}

/** Dimensões 4:5 usadas no card — equivalente ao preview mobile da Meta. */
export const META_CREATIVE_PHONE_THUMB_WIDTH = 400
export const META_CREATIVE_PHONE_THUMB_HEIGHT = 500

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
  const type = String(creative.object_type ?? '').toUpperCase()
  return type === 'VIDEO' || type === 'VIDEO_LISTING'
}

export function collectCreativeIds(
  creatives: Array<MetaCreativeFields | null | undefined>
): string[] {
  const ids = new Set<string>()
  for (const creative of creatives) {
    const id = trimUrl(creative?.id)
    if (id) ids.add(id)
  }
  return [...ids]
}

/** Busca thumbnail_url em dimensões mobile (estilo phone) via API nativa da Meta. */
export async function fetchCreativePhoneThumbnails(
  token: string,
  creativeIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!creativeIds.length) return map
  const chunk = 45
  for (let i = 0; i < creativeIds.length; i += chunk) {
    const slice = creativeIds.slice(i, i + chunk)
    const u = new URL('https://graph.facebook.com/v21.0/')
    u.searchParams.set('ids', slice.join(','))
    u.searchParams.set('fields', 'thumbnail_url')
    u.searchParams.set('thumbnail_width', String(META_CREATIVE_PHONE_THUMB_WIDTH))
    u.searchParams.set('thumbnail_height', String(META_CREATIVE_PHONE_THUMB_HEIGHT))
    u.searchParams.set('access_token', token)
    const r = await fetch(u.toString())
    const j = (await r.json()) as Record<
      string,
      { thumbnail_url?: string } | { error?: unknown }
    >
    for (const id of slice) {
      const o = j[id]
      if (!o || typeof o !== 'object' || 'error' in o) continue
      const url = trimUrl(o.thumbnail_url)
      if (url) map.set(id, url)
    }
  }
  return map
}

export function resolveCreativePreview(
  creative?: MetaCreativeFields | null,
  phoneByCreativeId?: Map<string, string>
): CreativePreview {
  const thumbnailUrl = trimUrl(creative?.thumbnail_url)
  const imageUrl = trimUrl(creative?.image_url)
  const creativeId = trimUrl(creative?.id)
  const phoneFromApi = creativeId ? phoneByCreativeId?.get(creativeId) ?? null : null
  const phoneUrl = firstUrl(phoneFromApi, imageUrl, thumbnailUrl)

  if (isVideoCreative(creative)) {
    const previewUrl = firstUrl(thumbnailUrl, phoneUrl, imageUrl)
    return {
      mediaType: 'video',
      thumbnailUrl: previewUrl,
      imageUrl: null,
      phoneUrl,
      previewUrl,
    }
  }

  const previewUrl = firstUrl(imageUrl, thumbnailUrl, phoneUrl)
  return {
    mediaType: 'image',
    thumbnailUrl,
    imageUrl: previewUrl,
    phoneUrl,
    previewUrl,
  }
}

export function resolveCreativeDisplayUrl(
  preview: CreativePreview,
  style: MetaCreativePreviewStyle = 'thumb'
): string | null {
  if (style === 'phone') {
    return preview.phoneUrl || preview.imageUrl || preview.thumbnailUrl || preview.previewUrl
  }
  return preview.thumbnailUrl || preview.previewUrl || preview.imageUrl || preview.phoneUrl
}
