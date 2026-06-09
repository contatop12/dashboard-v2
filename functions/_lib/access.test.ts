// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { verifyAccessJwt, AccessError } from './access'

const TEAM = 'p12-test.cloudflareaccess.com'
const AUD = 'test-aud-tag'
const KID = 'test-kid'

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function jsonToB64Url(obj: unknown): string {
  return bytesToB64Url(new TextEncoder().encode(JSON.stringify(obj)))
}

let keyPair: CryptoKeyPair
let jwks: { keys: JsonWebKey[] }

async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const header = { alg: 'RS256', kid: KID, typ: 'JWT' }
  const signingInput = `${jsonToB64Url(header)}.${jsonToB64Url(payload)}`
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  )
  return `${signingInput}.${bytesToB64Url(new Uint8Array(sig))}`
}

const fetchJwks = async () => jwks as { keys: (JsonWebKey & { kid?: string })[] }

beforeAll(async () => {
  keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  )
  const pubJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  jwks = { keys: [{ ...pubJwk, kid: KID }] }
})

function basePayload(overrides: Record<string, unknown> = {}) {
  const nowSec = Math.floor(Date.now() / 1000)
  return { iss: `https://${TEAM}`, aud: AUD, exp: nowSec + 3600, iat: nowSec, email: 'user@p12digital.com.br', ...overrides }
}

describe('verifyAccessJwt', () => {
  it('accepts a valid token and returns its payload', async () => {
    const token = await signJwt(basePayload())
    const payload = await verifyAccessJwt(token, { teamDomain: TEAM, aud: AUD, fetchJwks })
    expect(payload.email).toBe('user@p12digital.com.br')
  })

  it('rejects a tampered signature', async () => {
    const token = await signJwt(basePayload())
    const tampered = token.slice(0, -3) + (token.endsWith('AAA') ? 'BBB' : 'AAA')
    await expect(verifyAccessJwt(tampered, { teamDomain: TEAM, aud: AUD, fetchJwks })).rejects.toBeInstanceOf(AccessError)
  })

  it('rejects a wrong audience', async () => {
    const token = await signJwt(basePayload())
    await expect(verifyAccessJwt(token, { teamDomain: TEAM, aud: 'other-aud', fetchJwks })).rejects.toThrow(/audience/)
  })

  it('rejects an expired token', async () => {
    const token = await signJwt(basePayload({ exp: Math.floor(Date.now() / 1000) - 10 }))
    await expect(verifyAccessJwt(token, { teamDomain: TEAM, aud: AUD, fetchJwks })).rejects.toThrow(/expired/)
  })

  it('rejects a wrong issuer', async () => {
    const token = await signJwt(basePayload({ iss: 'https://evil.cloudflareaccess.com' }))
    await expect(verifyAccessJwt(token, { teamDomain: TEAM, aud: AUD, fetchJwks })).rejects.toThrow(/issuer/)
  })

  it('rejects missing or malformed tokens', async () => {
    await expect(verifyAccessJwt(null, { teamDomain: TEAM, aud: AUD, fetchJwks })).rejects.toThrow(/missing/)
    await expect(verifyAccessJwt('a.b', { teamDomain: TEAM, aud: AUD, fetchJwks })).rejects.toThrow(/malformed/)
  })
})
