/** Normaliza campos de mídia vindos da API ou legado (`image`, `thumbnailUrl`). */
export function normalizeCreativeMedia(item) {
  if (!item || typeof item !== 'object') {
    return {
      mediaType: 'image',
      thumbnailUrl: null,
      imageUrl: null,
      highResUrl: null,
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
  const highResUrl = item.highResUrl?.trim?.() || item.high_res_url?.trim?.() || null
  const previewUrl =
    mediaType === 'video'
      ? thumbnailUrl || imageUrl || highResUrl
      : imageUrl || highResUrl || thumbnailUrl || item.image || null

  return { mediaType, thumbnailUrl, imageUrl, highResUrl, previewUrl }
}

/** Escolhe a URL de exibição conforme o modo de qualidade. */
export function resolveCreativeDisplayUrl(media, qualityMode = 'balanced') {
  const { thumbnailUrl, imageUrl, highResUrl, previewUrl } = media
  switch (qualityMode) {
    case 'compact':
      return thumbnailUrl || imageUrl || highResUrl || previewUrl
    case 'high':
      return highResUrl || imageUrl || previewUrl || thumbnailUrl
    case 'balanced':
    default:
      return imageUrl || previewUrl || highResUrl || thumbnailUrl
  }
}
