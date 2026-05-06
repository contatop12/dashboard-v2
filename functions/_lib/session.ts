export const SESSION_COOKIE = 'dash_session'
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 14 // 14 dias

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    out[k] = decodeURIComponent(v)
  }
  return out
}

export function getSessionIdFromRequest(request: Request): string | null {
  const raw = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE]
  return raw && /^[0-9a-f-]{36}$/i.test(raw) ? raw : null
}

export function buildSetCookieHeader(sessionId: string, request: Request): string {
  const secure = new URL(request.url).protocol === 'https:'
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    `Max-Age=${SESSION_MAX_AGE_SEC}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function buildClearCookieHeader(request: Request): string {
  const secure = new URL(request.url).protocol === 'https:'
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax']
  if (secure) parts.push('Secure')
  return parts.join('; ')
}
