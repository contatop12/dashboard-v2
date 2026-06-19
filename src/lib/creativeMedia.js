/** Normaliza campos de mídia vindos da API ou legado (`image`, `thumbnailUrl`). */
export function normalizeCreativeMedia(item) {
  if (!item || typeof item !== 'object') {
    return { mediaType: 'image', thumbnailUrl: null, imageUrl: null, previewUrl: null }
  }

  const mediaType = item.mediaType === 'video' ? 'video' : 'image'
  const thumbnailUrl = item.thumbnailUrl?.trim?.() || item.thumbnail_url?.trim?.() || null
  const imageUrl =
    item.imageUrl?.trim?.() ||
    item.image_url?.trim?.() ||
    item.image?.trim?.() ||
    null
  const previewUrl =
    mediaType === 'video'
      ? thumbnailUrl || imageUrl
      : imageUrl || thumbnailUrl || item.thumbnailUrl || item.image || null

  return { mediaType, thumbnailUrl, imageUrl, previewUrl }
}
