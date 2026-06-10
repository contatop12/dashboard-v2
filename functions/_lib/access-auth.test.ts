// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ALLOWED_EMAILS,
  parseAllowedEmails,
  isEmailAllowed,
  normalizeAccessEmail,
} from './access-auth'

describe('access-auth', () => {
  it('defaults to the two P12 emails', () => {
    const allowed = parseAllowedEmails(undefined)
    for (const email of DEFAULT_ALLOWED_EMAILS) {
      expect(allowed.has(email)).toBe(true)
    }
    expect(allowed.size).toBe(2)
  })

  it('parses ACCESS_ALLOWED_EMAILS override', () => {
    const allowed = parseAllowedEmails('A@x.com, B@y.com ')
    expect(allowed.has('a@x.com')).toBe(true)
    expect(allowed.has('b@y.com')).toBe(true)
  })

  it('rejects emails outside the allowlist', () => {
    const allowed = parseAllowedEmails(undefined)
    expect(isEmailAllowed('outro@p12digital.com.br', allowed)).toBe(false)
    expect(isEmailAllowed('ryansantiago@p12digital.com.br', allowed)).toBe(true)
    expect(isEmailAllowed('danilo@p12digital.com.br', allowed)).toBe(true)
  })

  it('normalizes email from Access payload', () => {
    expect(normalizeAccessEmail({ email: ' Ryan@P12.com ' } as never)).toBe('ryan@p12.com')
    expect(normalizeAccessEmail({} as never)).toBeNull()
  })
})
