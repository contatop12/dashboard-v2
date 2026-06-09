import { describe, it, expect } from 'vitest'
import { buildMetaStatusRequest, normalizeStatus } from './meta-campaign-status'

describe('meta-campaign-status helpers', () => {
  it('normalizes status to ACTIVE/PAUSED only', () => {
    expect(normalizeStatus('active')).toBe('ACTIVE')
    expect(normalizeStatus('PAUSED')).toBe('PAUSED')
    expect(normalizeStatus('garbage')).toBeNull()
  })
  it('builds a graph POST url + body for a node id', () => {
    const { url, body } = buildMetaStatusRequest('123', 'PAUSED', 'TOKEN')
    expect(url).toBe('https://graph.facebook.com/v21.0/123')
    expect(body.get('status')).toBe('PAUSED')
    expect(body.get('access_token')).toBe('TOKEN')
  })
})
