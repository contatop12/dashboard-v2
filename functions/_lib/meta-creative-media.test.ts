import { describe, expect, it } from 'vitest'
import {
  collectCreativeMediaRefs,
  isVideoCreative,
  pickBestVideoPicture,
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
    expect(preview.highResUrl).toBe('https://cdn/full.jpg')
  })

  it('prioriza adimages e object_story_spec em alta resolução', () => {
    const preview = resolveCreativePreview(
      {
        thumbnail_url: 'https://cdn/thumb.jpg',
        image_url: 'https://cdn/medium.jpg',
        image_hash: 'abc123',
        object_story_spec: {
          link_data: { picture: 'https://cdn/story.jpg' },
        },
      },
      { adImageByHash: new Map([['abc123', 'https://cdn/full-adimage.jpg']]) }
    )
    expect(preview.highResUrl).toBe('https://cdn/full-adimage.jpg')
    expect(preview.imageUrl).toBe('https://cdn/medium.jpg')
  })

  it('detecta vídeo por object_type', () => {
    expect(isVideoCreative({ object_type: 'VIDEO_LISTING' })).toBe(true)
    expect(isVideoCreative({ object_type: 'PHOTO' })).toBe(false)
  })
})

describe('collectCreativeMediaRefs', () => {
  it('coleta hashes e video ids de nested fields', () => {
    const refs = collectCreativeMediaRefs([
      { image_hash: 'h1' },
      { object_story_spec: { video_data: { video_id: 'v99' } } },
    ])
    expect(refs.imageHashes).toEqual(['h1'])
    expect(refs.videoIds).toEqual(['v99'])
  })
})

describe('pickBestVideoPicture', () => {
  it('escolhe thumbnail com maior largura', () => {
    const url = pickBestVideoPicture({
      picture: 'https://cdn/small.jpg',
      thumbnails: {
        data: [
          { uri: 'https://cdn/t1.jpg', width: 120 },
          { uri: 'https://cdn/t2.jpg', width: 720 },
        ],
      },
    })
    expect(url).toBe('https://cdn/t2.jpg')
  })
})

describe('resolveCreativeDisplayUrl', () => {
  const preview = {
    mediaType: 'image' as const,
    thumbnailUrl: 'https://cdn/thumb.jpg',
    imageUrl: 'https://cdn/std.jpg',
    highResUrl: 'https://cdn/hi.jpg',
    previewUrl: 'https://cdn/std.jpg',
  }

  it('modo compact usa thumbnail', () => {
    expect(resolveCreativeDisplayUrl(preview, 'compact')).toBe('https://cdn/thumb.jpg')
  })

  it('modo high usa highResUrl', () => {
    expect(resolveCreativeDisplayUrl(preview, 'high')).toBe('https://cdn/hi.jpg')
  })

  it('modo balanced usa imageUrl', () => {
    expect(resolveCreativeDisplayUrl(preview, 'balanced')).toBe('https://cdn/std.jpg')
  })
})
