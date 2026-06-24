import { cn } from '@/lib/utils'
import { resolveCreativeDisplayUrl } from '@/lib/creativeMedia'

const DEFAULT_SIZES = '(max-width: 768px) 45vw, 208px'
const PHONE_SIZES = '(max-width: 768px) 90vw, 416px'

/**
 * Exibe criativos Meta no estilo thumb (miniatura) ou phone (preview mobile nativo).
 */
export default function CreativeMediaPreview({
  mediaType = 'image',
  imageUrl,
  thumbnailUrl,
  phoneUrl,
  previewUrl,
  previewStyle = 'thumb',
  alt = '',
  className,
  sizes,
}) {
  const media = {
    mediaType,
    thumbnailUrl,
    imageUrl,
    phoneUrl,
    previewUrl,
  }
  const displayUrl = resolveCreativeDisplayUrl(media, previewStyle)
  const isPhone = previewStyle === 'phone'
  const resolvedSizes = sizes ?? (isPhone ? PHONE_SIZES : DEFAULT_SIZES)

  if (!displayUrl) return null

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
