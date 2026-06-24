import { cn } from '@/lib/utils'
import { resolveCreativeDisplayUrl } from '@/lib/creativeMedia'

const DEFAULT_SIZES = '(max-width: 768px) 45vw, 208px'
const HIGH_QUALITY_SIZES = '(max-width: 768px) 90vw, 416px'

/**
 * Vídeo: carrega só o thumbnail (leve) ou frame em alta conforme qualityMode.
 * Imagem estática: `<picture>` com thumb em viewports menores e imagem completa no fallback.
 */
export default function CreativeMediaPreview({
  mediaType = 'image',
  imageUrl,
  thumbnailUrl,
  highResUrl,
  previewUrl,
  qualityMode = 'balanced',
  alt = '',
  className,
  sizes,
}) {
  const media = {
    mediaType,
    thumbnailUrl,
    imageUrl,
    highResUrl,
    previewUrl,
  }
  const displayUrl = resolveCreativeDisplayUrl(media, qualityMode)
  const thumb = thumbnailUrl?.trim() || null
  const isHigh = qualityMode === 'high'
  const resolvedSizes = sizes ?? (isHigh ? HIGH_QUALITY_SIZES : DEFAULT_SIZES)

  if (!displayUrl) return null

  if (mediaType === 'video') {
    return (
      <img
        src={displayUrl}
        alt={alt}
        className={cn('h-full w-full object-cover', className)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        sizes={resolvedSizes}
      />
    )
  }

  const useResponsivePicture =
    qualityMode === 'balanced' && thumb && displayUrl && thumb !== displayUrl

  if (useResponsivePicture) {
    return (
      <picture className="block h-full w-full">
        <source srcSet={thumb} media="(max-width: 768px)" />
        <img
          src={displayUrl}
          alt={alt}
          className={cn('h-full w-full object-cover', className)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          sizes={resolvedSizes}
        />
      </picture>
    )
  }

  return (
    <img
      src={displayUrl}
      alt={alt}
      className={cn('h-full w-full object-cover', className)}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      sizes={resolvedSizes}
    />
  )
}
