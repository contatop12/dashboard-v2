/** PBKDF2-SHA256 — mesmo algoritmo no Worker e no script Node de seed (100k iters). */

export const PBKDF2_ITERATIONS = 100_000

export function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return [...u8].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '')
  if (clean.length % 2 !== 0) throw new Error('hex inválido')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16)
  }
  return out
}

export async function derivePasswordHash(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )
  return new Uint8Array(bits)
}

export async function verifyPassword(
  password: string,
  saltHex: string,
  hashHex: string
): Promise<boolean> {
  const salt = hexToBytes(saltHex)
  const expected = hexToBytes(hashHex)
  const actual = await derivePasswordHash(password, salt)
  if (actual.length !== expected.length) return false
  let ok = 0
  for (let i = 0; i < actual.length; i++) ok |= actual[i] ^ expected[i]
  return ok === 0
}
