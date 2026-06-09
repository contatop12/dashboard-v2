/**
 * Cloudflare Access (Zero Trust) JWT verification.
 *
 * When the app sits behind Cloudflare Access, every request carries a signed
 * `Cf-Access-Jwt-Assertion` header. We verify it here as defense-in-depth so the
 * Worker rejects any request that did not pass through Access — even if the edge
 * policy is bypassed or misconfigured.
 *
 * Verification: RS256 signature against the team JWKS, plus issuer / audience /
 * expiry checks. JWKS is cached in-memory per team domain.
 */

export type AccessPayload = {
  aud: string | string[]
  iss: string
  exp: number
  iat?: number
  nbf?: number
  email?: string
  sub?: string
  [k: string]: unknown
}

export class AccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AccessError'
  }
}

type Jwk = JsonWebKey & { kid?: string }
type Jwks = { keys: Jwk[] }

export const ACCESS_JWT_HEADER = 'Cf-Access-Jwt-Assertion'

function base64UrlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function decodeSegment(segment: string): Record<string, unknown> {
  const text = new TextDecoder().decode(base64UrlToBytes(segment))
  return JSON.parse(text) as Record<string, unknown>
}

const jwksCache = new Map<string, { jwks: Jwks; fetchedAt: number }>()
const JWKS_TTL_MS = 60 * 60 * 1000 // 1h

export type FetchJwks = (teamDomain: string) => Promise<Jwks>

/** Fetch the team's signing keys, cached for 1h. */
export const defaultFetchJwks: FetchJwks = async (teamDomain) => {
  const cached = jwksCache.get(teamDomain)
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.jwks
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`)
  if (!res.ok) throw new AccessError(`JWKS fetch failed (${res.status})`)
  const jwks = (await res.json()) as Jwks
  jwksCache.set(teamDomain, { jwks, fetchedAt: Date.now() })
  return jwks
}

export type VerifyOptions = {
  teamDomain: string
  aud: string
  fetchJwks?: FetchJwks
  now?: number
}

/**
 * Verify a Cloudflare Access JWT. Returns the payload on success, throws
 * AccessError otherwise. `fetchJwks` and `now` are injectable for testing.
 */
export async function verifyAccessJwt(
  token: string | null | undefined,
  { teamDomain, aud, fetchJwks = defaultFetchJwks, now = Date.now() }: VerifyOptions
): Promise<AccessPayload> {
  if (!token) throw new AccessError('missing token')
  const parts = token.split('.')
  if (parts.length !== 3) throw new AccessError('malformed token')
  const [headerSeg, payloadSeg, signatureSeg] = parts

  const header = decodeSegment(headerSeg)
  if (header.alg !== 'RS256') throw new AccessError('unsupported alg')

  const payload = decodeSegment(payloadSeg) as AccessPayload

  const jwks = await fetchJwks(teamDomain)
  const kid = typeof header.kid === 'string' ? header.kid : undefined
  const jwk = (kid ? jwks.keys.find((k) => k.kid === kid) : undefined) ?? jwks.keys[0]
  if (!jwk) throw new AccessError('no matching signing key')

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const data = new TextEncoder().encode(`${headerSeg}.${payloadSeg}`)
  const signature = base64UrlToBytes(signatureSeg)
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data)
  if (!ok) throw new AccessError('bad signature')

  const nowSec = Math.floor(now / 1000)
  if (typeof payload.exp === 'number' && nowSec >= payload.exp) throw new AccessError('expired')
  if (typeof payload.nbf === 'number' && nowSec < payload.nbf) throw new AccessError('not yet valid')
  if (payload.iss !== `https://${teamDomain}`) throw new AccessError('bad issuer')

  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!auds.includes(aud)) throw new AccessError('bad audience')

  return payload
}
