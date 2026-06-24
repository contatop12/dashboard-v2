/** Normaliza campos de mídia vindos da API ou legado (`image`, `thumbnailUrl`). */
export function normalizeCreativeMedia(item) {
  if (!item || typeof item !== 'object') {
    return {
      mediaType: 'image',
      thumbnailUrl: null,
      imageUrl: null,
      phoneUrl: null,
      previewUrl: null,
    }
  }

  const mediaType = item.mediaType === 'video' ? 'video' : 'image'
  const thumbnailUrl = item.thumbnailUrl?.trim?.() || item.thumbnail_url?.trim?.() || null
  const imageUrl =
    item.imageUrl?.trim?.() ||
    item.image_url?.trim?.() ||
    item.image?.trim?.() ||
    null
  const phoneUrl = item.phoneUrl?.trim?.() || item.phone_url?.trim?.() || null
  const previewUrl =
    mediaType === 'video'
      ? thumbnailUrl || phoneUrl || imageUrl
      : imageUrl || phoneUrl || thumbnailUrl || item.image || null

  return { mediaType, thumbnailUrl, imageUrl, phoneUrl, previewUrl }
}

/** Escolhe a URL conforme o estilo nativo Meta (thumb | phone). */
export function resolveCreativeDisplayUrl(media, previewStyle = 'thumb') {
  const { thumbnailUrl, imageUrl, phoneUrl, previewUrl } = media
  if (previewStyle === 'phone') {
    return phoneUrl || imageUrl || previewUrl || thumbnailUrl
  }
  return thumbnailUrl || previewUrl || imageUrl || phoneUrl
}
