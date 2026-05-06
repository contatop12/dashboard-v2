/** Cifra valores para colunas *_enc no D1 (AES-256-GCM). OAUTH_ENC_KEY = Base64 de 32 bytes. */

async function getAesKey(base64Key: string): Promise<CryptoKey> {
  const clean = base64Key.trim().replace(/\s/g, '')
  let raw: Uint8Array
  try {
    const bin = atob(clean)
    raw = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i)
  } catch {
    throw new Error('OAUTH_ENC_KEY inválida (Base64)')
  }
  if (raw.length !== 32) {
    throw new Error('OAUTH_ENC_KEY deve decodificar para exatamente 32 bytes')
  }
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function encryptTokenForStorage(plain: string, oauthEncKeyB64: string): Promise<string> {
  const key = await getAesKey(oauthEncKeyB64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain)
  )
  return `${b64(iv.buffer)}:${b64(ct)}`
}

export async function decryptTokenFromStorage(enc: string, oauthEncKeyB64: string): Promise<string> {
  const key = await getAesKey(oauthEncKeyB64)
  const [ivPart, ctPart] = enc.split(':')
  if (!ivPart || !ctPart) throw new Error('token enc inválido')
  const iv = fromB64(ivPart)
  const ct = fromB64(ctPart)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}
