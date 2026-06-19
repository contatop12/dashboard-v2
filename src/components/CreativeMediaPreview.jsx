import { cn } from '@/lib/utils'

const DEFAULT_SIZES = '(max-width: 768px) 45vw, 208px'

/**
 * Vídeo: carrega só o thumbnail (leve).
 * Imagem estática: `<picture>` com thumb em viewports menores e imagem completa no fallback.
 */
export default function CreativeMediaPreview({
  mediaType = 'image',
  imageUrl,
  thumbnailUrl,
  previewUrl,
  alt = '',
  className,
  sizes = DEFAULT_SIZES,
}) {
  const thumb = thumbnailUrl?.trim() || null
  const full = imageUrl?.trim() || previewUrl?.trim() || null

  if (mediaType === 'video') {
    const src = thumb || full
    if (!src) return null
    return (
      <img
        src={src}
        alt={alt}
        className={cn('h-full w-full object-cover', className)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        sizes={sizes}
      />
    )
  }

  const fallback = full || thumb
  if (!fallback) return null

  if (thumb && full && thumb !== full) {
    return (
      <picture className="block h-full w-full">
        <source srcSet={thumb} media="(max-width: 768px)" />
        <img
          src={full}
          alt={alt}
          className={cn('h-full w-full object-cover', className)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          sizes={sizes}
        />
      </picture>
    )
  }

  return (
    <picture className="block h-full w-full">
      <img
        src={fallback}
        alt={alt}
        className={cn('h-full w-full object-cover', className)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        sizes={sizes}
      />
    </picture>
  )
}
