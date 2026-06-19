import { describe, expect, it } from 'vitest'
import { isVideoCreative, resolveCreativePreview } from './meta-creative-media'

describe('resolveCreativePreview', () => {
  it('usa thumbnail para vídeo e não expõe imageUrl', () => {
    const preview = resolveCreativePreview({
      video_id: '123',
      thumbnail_url: 'https://cdn/thumb.jpg',
      image_url: 'https://cdn/full.jpg',
      object_type: 'VIDEO',
    })
    expect(preview.mediaType).toBe('video')
    expect(preview.thumbnailUrl).toBe('https://cdn/thumb.jpg')
    expect(preview.imageUrl).toBeNull()
    expect(preview.previewUrl).toBe('https://cdn/thumb.jpg')
  })

  it('usa picture sources para imagem estática', () => {
    const preview = resolveCreativePreview({
      thumbnail_url: 'https://cdn/thumb.jpg',
      image_url: 'https://cdn/full.jpg',
      object_type: 'PHOTO',
    })
    expect(preview.mediaType).toBe('image')
    expect(preview.thumbnailUrl).toBe('https://cdn/thumb.jpg')
    expect(preview.imageUrl).toBe('https://cdn/full.jpg')
  })

  it('detecta vídeo por object_type', () => {
    expect(isVideoCreative({ object_type: 'VIDEO_LISTING' })).toBe(true)
    expect(isVideoCreative({ object_type: 'PHOTO' })).toBe(false)
  })
})
