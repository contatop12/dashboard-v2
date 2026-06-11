#!/usr/bin/env node
/**
 * Provision a Cloudflare Access (Zero Trust) self-hosted application that puts the
 * dashboard behind identity, with a 2-hour session. Idempotent: reuses an existing
 * application for the same domain instead of creating a duplicate.
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN         API token with: Access: Apps Edit, Access: Policies Edit,
 *                                Access: Organizations Read, Account Settings Read
 *   CLOUDFLARE_ACCOUNT_ID        Cloudflare account id
 *   ACCESS_APP_DOMAIN            custom domain the app is served on (e.g. dashboard.p12digital.com.br)
 *   ACCESS_ALLOWED_EMAILS        comma-separated emails (default: ryansantiago@ and danilo@ @p12digital.com.br)
 *   ACCESS_ALLOWED_EMAIL_DOMAIN  legacy fallback if ACCESS_ALLOWED_EMAILS unset (e.g. p12digital.com.br)
 *
 * Optional env:
 *   ACCESS_APP_NAME              default "P12 Dashboard"
 *   ACCESS_SESSION_DURATION      default "2h"
 *   ACCESS_IDP_MATCH             substring to pick a Google IdP by name (default "google")
 *   DRY_RUN=1                    print what would happen, create nothing
 *
 * Usage (PowerShell):
 *   $env:CLOUDFLARE_API_TOKEN="…"; $env:CLOUDFLARE_ACCOUNT_ID="…"
 *   $env:ACCESS_APP_DOMAIN="dashboard.p12digital.com.br"
 *   $env:ACCESS_ALLOWED_EMAIL_DOMAIN="p12digital.com.br"
 *   node scripts/setup-cloudflare-access.mjs
 */

import { loadDotEnv } from './load-dotenv.mjs'

loadDotEnv()

const API = 'https://api.cloudflare.com/client/v4'

const token = req('CLOUDFLARE_API_TOKEN')
const accountId = req('CLOUDFLARE_ACCOUNT_ID')
const appDomain = req('ACCESS_APP_DOMAIN')
const allowedEmailsRaw =
  process.env.ACCESS_ALLOWED_EMAILS?.trim() ||
  'ryansantiago@p12digital.com.br,danilo@p12digital.com.br'
const allowedEmails = allowedEmailsRaw
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)
const emailDomain = process.env.ACCESS_ALLOWED_EMAIL_DOMAIN?.trim()
const appName = process.env.ACCESS_APP_NAME || 'P12 Dashboard'
const sessionDuration = process.env.ACCESS_SESSION_DURATION || '2h'
const idpMatch = (process.env.ACCESS_IDP_MATCH || 'google').toLowerCase()
const dryRun = ['1', 'true', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase())

function req(name) {
  const v = process.env[name]
  if (!v || !v.trim()) {
    console.error(`Missing required env: ${name}`)
    process.exit(1)
  }
  return v.trim()
}

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    const errs = Array.isArray(body.errors) ? body.errors.map((e) => e.message).join('; ') : `HTTP ${res.status}`
    throw new Error(`${init.method || 'GET'} ${path} failed: ${errs}`)
  }
  return body.result
}

async function main() {
  console.log(`→ Account: ${accountId}`)
  console.log(
    `→ App domain: ${appDomain} · session: ${sessionDuration} · allow: ${allowedEmails.join(', ')}\n`
  )

  // 1. Team auth domain (the <team>.cloudflareaccess.com used for JWT issuer/JWKS)
  const org = await api(`/accounts/${accountId}/access/organizations`)
  const teamDomain = org?.auth_domain
  if (!teamDomain) throw new Error('Could not resolve team auth_domain — is Zero Trust enabled on this account?')
  console.log(`✓ Team domain: ${teamDomain}`)

  // 2. Identity provider — OTP por e-mail (funciona com política por e-mail) ou Google se existir
  const idps = await api(`/accounts/${accountId}/access/identity_providers`)
  const google = (idps || []).find((p) => String(p.name || '').toLowerCase().includes(idpMatch) || p.type === 'google' || p.type === 'google-apps')
  let otp = (idps || []).find((p) => p.type === 'onetimepin')

  if (google) {
    console.log(`✓ Identity provider: ${google.name} (${google.id})`)
  } else if (!otp && !dryRun) {
    console.log('+ Creating One-time PIN identity provider')
    otp = await api(`/accounts/${accountId}/access/identity_providers`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Login por e-mail (PIN)', type: 'onetimepin', config: {} }),
    })
    console.log(`✓ One-time PIN IdP (${otp.id})`)
  } else if (otp) {
    console.log(`✓ One-time PIN IdP (${otp.id})`)
  } else if (dryRun) {
    console.log('  [DRY_RUN] would create One-time PIN IdP')
  }

  const loginIdp = google || otp
  const allowedIdps = loginIdp ? [loginIdp.id] : undefined
  if (!loginIdp && !dryRun) {
    console.log('! Nenhum IdP disponível — configure Google em Zero Trust → Authentication')
  }

  // 3. Reuse or create the Access application for this domain
  const apps = await api(`/accounts/${accountId}/access/apps`)
  let app = (apps || []).find((a) => a.domain === appDomain)

  const appPayload = {
    name: appName,
    domain: appDomain,
    type: 'self_hosted',
    session_duration: sessionDuration,
    auto_redirect_to_identity: !!loginIdp,
    ...(allowedIdps ? { allowed_idps: allowedIdps } : {}),
    app_launcher_visible: true,
  }

  if (app) {
    console.log(`✓ Application exists (${app.id}) — updating session/idp`)
    if (!dryRun) app = await api(`/accounts/${accountId}/access/apps/${app.id}`, { method: 'PUT', body: JSON.stringify(appPayload) })
  } else {
    console.log(`+ Creating application "${appName}"`)
    if (dryRun) {
      console.log('  [DRY_RUN] would POST', JSON.stringify(appPayload))
    } else {
      app = await api(`/accounts/${accountId}/access/apps`, { method: 'POST', body: JSON.stringify(appPayload) })
    }
  }

  // 4. Allow policy: only explicit emails (or legacy email domain)
  const policyPayload = allowedEmails.length
    ? {
        name: `Allow ${allowedEmails.length} email(s)`,
        decision: 'allow',
        include: allowedEmails.map((email) => ({ email: { email } })),
      }
    : {
        name: `Allow @${emailDomain}`,
        decision: 'allow',
        include: [{ email_domain: { domain: emailDomain } }],
      }
  if (app && !dryRun) {
    const policies = await api(`/accounts/${accountId}/access/apps/${app.id}/policies`).catch(() => [])
    const allowPolicies = (policies || []).filter((p) => p.decision === 'allow')
    const existing = allowPolicies.find((p) => p.name === policyPayload.name) ?? allowPolicies[0]

    if (existing) {
      console.log(`✓ Updating allow policy (${existing.id}) → ${allowedEmails.join(', ')}`)
      await api(`/accounts/${accountId}/access/apps/${app.id}/policies/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...policyPayload, precedence: existing.precedence ?? 1 }),
      })
    } else {
      const created = await api(`/accounts/${accountId}/access/apps/${app.id}/policies`, {
        method: 'POST',
        body: JSON.stringify(policyPayload),
      })
      console.log(`+ Policy created (${created.id})`)
    }
  } else if (dryRun) {
    console.log('  [DRY_RUN] would create policy', JSON.stringify(policyPayload))
  }

  const aud = app?.aud
  console.log('\n────────────────────────────────────────')
  console.log('Set these on the Worker so it verifies the Access JWT:')
  console.log(`  CF_ACCESS_TEAM_DOMAIN = ${teamDomain}`)
  console.log(`  CF_ACCESS_AUD         = ${aud || '<run without DRY_RUN to get the AUD>'}`)
  console.log('\nApply with wrangler:')
  console.log(`  npx wrangler secret put CF_ACCESS_TEAM_DOMAIN   # paste: ${teamDomain}`)
  console.log(`  npx wrangler secret put CF_ACCESS_AUD           # paste: ${aud || '<AUD>'}`)
  console.log('────────────────────────────────────────')
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`)
  process.exit(1)
})
