// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { withSecurityHeaders, DEFAULT_CSP } from './security-headers'

describe('withSecurityHeaders', () => {
  it('sets the core hardening headers', () => {
    const r = withSecurityHeaders(new Response('ok'))
    expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(r.headers.get('X-Frame-Options')).toBe('DENY')
    expect(r.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(r.headers.get('Strict-Transport-Security')).toContain('max-age=31536000')
    expect(r.headers.get('Content-Security-Policy')).toBe(DEFAULT_CSP)
  })

  it('preserves the original body and status', async () => {
    const r = withSecurityHeaders(new Response('hello', { status: 201 }))
    expect(r.status).toBe(201)
    expect(await r.text()).toBe('hello')
  })

  it('omits CSP when CSP_DISABLED is set', () => {
    const r = withSecurityHeaders(new Response('ok'), { CSP_DISABLED: '1' })
    expect(r.headers.get('Content-Security-Policy')).toBeNull()
  })
})
