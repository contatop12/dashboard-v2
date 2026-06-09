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
 *   ACCESS_ALLOWED_EMAIL_DOMAIN  email domain allowed to log in (e.g. p12digital.com.br)
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

const API = 'https://api.cloudflare.com/client/v4'

const token = req('CLOUDFLARE_API_TOKEN')
const accountId = req('CLOUDFLARE_ACCOUNT_ID')
const appDomain = req('ACCESS_APP_DOMAIN')
const emailDomain = req('ACCESS_ALLOWED_EMAIL_DOMAIN')
const appName = process.env.ACCESS_APP_NAME || 'P12 Dashboard'
const sessionDuration = process.env.ACCESS_SESSION_DURATION || '2h'
const idpMatch = (process.env.ACCESS_IDP_MATCH || 'google').toLowerCase()
const dryRun = !!process.env.DRY_RUN && process.env.DRY_RUN !== '0'

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
  console.log(`→ App domain: ${appDomain} · session: ${sessionDuration} · allow @${emailDomain}\n`)

  // 1. Team auth domain (the <team>.cloudflareaccess.com used for JWT issuer/JWKS)
  const org = await api(`/accounts/${accountId}/access/organizations`)
  const teamDomain = org?.auth_domain
  if (!teamDomain) throw new Error('Could not resolve team auth_domain — is Zero Trust enabled on this account?')
  console.log(`✓ Team domain: ${teamDomain}`)

  // 2. Find a Google identity provider (optional but recommended)
  const idps = await api(`/accounts/${accountId}/access/identity_providers`)
  const google = (idps || []).find((p) => String(p.name || '').toLowerCase().includes(idpMatch) || p.type === 'google' || p.type === 'google-apps')
  if (google) {
    console.log(`✓ Identity provider: ${google.name} (${google.id})`)
  } else {
    console.log(`! No Google IdP found. Add one in Zero Trust → Settings → Authentication, then re-run.`)
    console.log(`  Continuing — the app will be created allowing all configured login methods.`)
  }
  const allowedIdps = google ? [google.id] : undefined

  // 3. Reuse or create the Access application for this domain
  const apps = await api(`/accounts/${accountId}/access/apps`)
  let app = (apps || []).find((a) => a.domain === appDomain)

  const appPayload = {
    name: appName,
    domain: appDomain,
    type: 'self_hosted',
    session_duration: sessionDuration,
    auto_redirect_to_identity: !!google,
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

  // 4. Allow policy: only the org's email domain (via Google IdP when present)
  const policyPayload = {
    name: `Allow @${emailDomain}`,
    decision: 'allow',
    include: [{ email_domain: { domain: emailDomain } }],
  }
  if (app && !dryRun) {
    const policies = await api(`/accounts/${accountId}/access/apps/${app.id}/policies`).catch(() => [])
    const existing = (policies || []).find((p) => p.name === policyPayload.name)
    if (existing) {
      console.log(`✓ Policy exists (${existing.id})`)
    } else {
      const created = await api(`/accounts/${accountId}/access/apps/${app.id}/policies`, { method: 'POST', body: JSON.stringify(policyPayload) })
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
