import type { D1Database } from '@cloudflare/workers-types'
import type { AccessPayload } from './access'
import { findUserByEmail, type UserRow } from './auth'

/** E-mails autorizados quando ACCESS_ALLOWED_EMAILS não está definido no Worker. */
export const DEFAULT_ALLOWED_EMAILS = [
  'ryansantiago@p12digital.com.br',
  'danilo@p12digital.com.br',
] as const

export function parseAllowedEmails(raw: string | undefined): Set<string> {
  if (raw?.trim()) {
    return new Set(
      raw
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    )
  }
  return new Set(DEFAULT_ALLOWED_EMAILS.map((e) => e.toLowerCase()))
}

export function normalizeAccessEmail(payload: AccessPayload): string | null {
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  return email || null
}

export function isEmailAllowed(email: string, allowed: Set<string>): boolean {
  return allowed.has(email.trim().toLowerCase())
}

export async function resolveUserFromAccess(
  db: D1Database,
  payload: AccessPayload,
  allowedEmails: Set<string>
): Promise<UserRow | null> {
  const email = normalizeAccessEmail(payload)
  if (!email || !isEmailAllowed(email, allowedEmails)) return null
  return findUserByEmail(db, email)
}
