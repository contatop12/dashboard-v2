import type { WorkerEnv } from './worker-env'

export type OAuthStatePayload = {
  u: string
  o: string
  p: 'meta' | 'google'
  exp: number
  n: string
}

function encSecret(env: WorkerEnv): string {
  const s = env.OAUTH_STATE_SECRET?.trim() || env.OAUTH_ENC_KEY?.trim()
  if (!s) throw new Error('Defina OAUTH_STATE_SECRET ou OAUTH_ENC_KEY nas variáveis do Worker')
  return s
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(secret)
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

function b64url(buf: Uint8Array | ArrayBuffer): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
  const b64 = btoa(s)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function signOAuthState(env: WorkerEnv, payload: OAuthStatePayload): Promise<string> {
  const secret = encSecret(env)
  const body = JSON.stringify(payload)
  const payloadBytes = new TextEncoder().encode(body)
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, payloadBytes)
  return `${b64url(payloadBytes)}.${b64url(sig)}`
}

export async function verifyOAuthState(env: WorkerEnv, token: string): Promise<OAuthStatePayload | null> {
  const secret = encSecret(env)
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payloadB64 = token.slice(0, dot)
  const sigB64 = token.slice(dot + 1)
  let payloadBytes: Uint8Array
  let sig: Uint8Array
  try {
    payloadBytes = fromB64url(payloadB64)
    sig = fromB64url(sigB64)
  } catch {
    return null
  }
  const key = await hmacKey(secret)
  const ok = await crypto.subtle.verify('HMAC', key, sig, payloadBytes)
  if (!ok) return null
  let data: OAuthStatePayload
  try {
    data = JSON.parse(new TextDecoder().decode(payloadBytes)) as OAuthStatePayload
  } catch {
    return null
  }
  if (!data.u || !data.o || !data.p || !data.exp || !data.n) return null
  if (data.p !== 'meta' && data.p !== 'google') return null
  if (Math.floor(Date.now() / 1000) > data.exp) return null
  return data
}
