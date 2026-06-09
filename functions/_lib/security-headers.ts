import type { WorkerEnv } from './worker-env'

/**
 * Content-Security-Policy for the SPA. Server-side calls (Graph, Google Ads) run
 * in the Worker, not the browser, so `connect-src 'self'` is enough. Style/font
 * sources cover Google Fonts; `'unsafe-inline'` on style-src is required because
 * recharts and Tailwind emit inline style attributes.
 */
export const DEFAULT_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "script-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
].join('; ')

function isTruthy(v: string | undefined): boolean {
  return !!v && v !== '0' && v.toLowerCase() !== 'false'
}

/** Apply defense-in-depth security headers to any response. Returns a new Response. */
export function withSecurityHeaders(response: Response, env: Partial<WorkerEnv> = {}): Response {
  const res = new Response(response.body, response)
  const h = res.headers
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('X-Frame-Options', 'DENY')
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  h.set('Cross-Origin-Opener-Policy', 'same-origin')
  if (!isTruthy(env.CSP_DISABLED)) {
    h.set('Content-Security-Policy', DEFAULT_CSP)
  }
  return res
}
