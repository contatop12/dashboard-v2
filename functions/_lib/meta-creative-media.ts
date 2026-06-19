export type MetaCreativeFields = {
  thumbnail_url?: string
  image_url?: string
  object_type?: string
  video_id?: string
}

export type CreativePreview = {
  mediaType: 'video' | 'image'
  thumbnailUrl: string | null
  imageUrl: string | null
  /** URL legado para cards que ainda usam um único campo. */
  previewUrl: string | null
}

function trimUrl(value: string | undefined): string | null {
  const v = value?.trim()
  return v || null
}

export function isVideoCreative(creative?: MetaCreativeFields | null): boolean {
  if (!creative) return false
  if (creative.video_id?.trim()) return true
  const type = String(creative.object_type ?? '').toUpperCase()
  return type === 'VIDEO' || type === 'VIDEO_LISTING'
}

export function resolveCreativePreview(creative?: MetaCreativeFields | null): CreativePreview {
  const thumbnailUrl = trimUrl(creative?.thumbnail_url)
  const imageUrl = trimUrl(creative?.image_url)

  if (isVideoCreative(creative)) {
    const previewUrl = thumbnailUrl || imageUrl
    return {
      mediaType: 'video',
      thumbnailUrl: previewUrl,
      imageUrl: null,
      previewUrl,
    }
  }

  const previewUrl = imageUrl || thumbnailUrl
  return {
    mediaType: 'image',
    thumbnailUrl,
    imageUrl: previewUrl,
    previewUrl,
  }
}
