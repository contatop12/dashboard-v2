import { describe, expect, it } from 'vitest'
import {
  collectCreativeIds,
  isVideoCreative,
  resolveCreativeDisplayUrl,
  resolveCreativePreview,
} from './meta-creative-media'

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
    expect(preview.phoneUrl).toBe('https://cdn/full.jpg')
  })

  it('usa phone thumbnail da API quando disponível', () => {
    const preview = resolveCreativePreview(
      {
        id: 'cr1',
        thumbnail_url: 'https://cdn/thumb.jpg',
        image_url: 'https://cdn/full.jpg',
      },
      new Map([['cr1', 'https://cdn/phone.jpg']])
    )
    expect(preview.phoneUrl).toBe('https://cdn/phone.jpg')
  })

  it('detecta vídeo por object_type', () => {
    expect(isVideoCreative({ object_type: 'VIDEO_LISTING' })).toBe(true)
    expect(isVideoCreative({ object_type: 'PHOTO' })).toBe(false)
  })
})

describe('collectCreativeIds', () => {
  it('coleta ids únicos', () => {
    expect(collectCreativeIds([{ id: 'a' }, { id: 'b' }, { id: 'a' }])).toEqual(['a', 'b'])
  })
})

describe('resolveCreativeDisplayUrl', () => {
  const preview = {
    mediaType: 'image' as const,
    thumbnailUrl: 'https://cdn/thumb.jpg',
    imageUrl: 'https://cdn/std.jpg',
    phoneUrl: 'https://cdn/phone.jpg',
    previewUrl: 'https://cdn/std.jpg',
  }

  it('estilo thumb usa thumbnail', () => {
    expect(resolveCreativeDisplayUrl(preview, 'thumb')).toBe('https://cdn/thumb.jpg')
  })

  it('estilo phone usa phoneUrl', () => {
    expect(resolveCreativeDisplayUrl(preview, 'phone')).toBe('https://cdn/phone.jpg')
  })
})
