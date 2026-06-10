#!/usr/bin/env node
/**
 * Sincroniza secrets do Worker a partir do .env via Cloudflare API.
 * Uso: node scripts/sync-worker-secrets.mjs
 * Requer: CLOUDFLARE_API_TOKEN e ID_ACCOUNT_CLOUDFLARE (ou CLOUDFLARE_ACCOUNT_ID) no .env
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const API = 'https://api.cloudflare.com/client/v4'
const WORKER = 'dashboard-v2'

function parseDotEnv(content) {
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

/** Mapeia chaves do .env → secrets do Worker. */
function buildSecretMap(env) {
  const map = {}
  const copy = [
    'META_ACCESS_TOKEN',
    'META_BUSINESS_ID',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_API_VERSION',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
    'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
    'GOOGLE_ADS_MCC_ID',
    'CF_ACCESS_TEAM_DOMAIN',
    'CF_ACCESS_AUD',
    'OAUTH_ENC_KEY',
    'OAUTH_STATE_SECRET',
    'META_INSTAGRAM_USER_ID',
  ]
  for (const key of copy) {
    if (env[key]?.trim()) map[key] = env[key].trim()
  }
  if (env.SEU_APP_ID?.trim()) map.META_APP_ID = env.SEU_APP_ID.trim()
  if (env.SEU_APP_SECRET?.trim()) map.META_APP_SECRET = env.SEU_APP_SECRET.trim()
  if (env.META_APP_ID?.trim()) map.META_APP_ID = env.META_APP_ID.trim()
  if (env.META_APP_SECRET?.trim()) map.META_APP_SECRET = env.META_APP_SECRET.trim()

  if (env.GOOGLE_ADS_MCC_ID?.trim()) {
    map.GOOGLE_ADS_MCC_ID = env.GOOGLE_ADS_MCC_ID.trim()
    if (!env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim()) {
      map.GOOGLE_ADS_LOGIN_CUSTOMER_ID = env.GOOGLE_ADS_MCC_ID.trim()
    }
  }

  map.ACCESS_ALLOWED_EMAILS =
    env.ACCESS_ALLOWED_EMAILS?.trim() ||
    'ryansantiago@p12digital.com.br,danilo@p12digital.com.br'

  return map
}

async function api(token, accountId, method, apiPath, body) {
  const res = await fetch(`${API}${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) {
    const errs = Array.isArray(data.errors)
      ? data.errors.map((e) => e.message).join('; ')
      : `HTTP ${res.status}`
    throw new Error(`${method} ${apiPath} failed: ${errs}`)
  }
  return data.result
}

async function putSecret(token, accountId, name, text) {
  await api(token, accountId, 'PUT', `/accounts/${accountId}/workers/scripts/${WORKER}/secrets`, {
    name,
    text,
    type: 'secret_text',
  })
}

async function main() {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) {
    console.error('.env não encontrado')
    process.exit(1)
  }
  const env = parseDotEnv(fs.readFileSync(envPath, 'utf8'))
  const token = (process.env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_TOKEN || '').trim()
  const accountId =
    env.CLOUDFLARE_ACCOUNT_ID?.trim() ||
    env.ID_ACCOUNT_CLOUDFLARE?.trim()
  if (!token || !accountId) {
    console.error('Defina CLOUDFLARE_API_TOKEN e ID_ACCOUNT_CLOUDFLARE no .env')
    process.exit(1)
  }

  const secrets = buildSecretMap(env)
  const names = Object.keys(secrets)
  if (!names.length) {
    console.error('Nenhum secret para enviar.')
    process.exit(1)
  }

  console.log(`→ Worker: ${WORKER} · conta: ${accountId}`)
  console.log(`→ Enviando ${names.length} secret(s)…\n`)

  for (const name of names) {
    await putSecret(token, accountId, name, secrets[name])
    console.log(`✓ ${name}`)
  }

  console.log('\nConcluído.')
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`)
  process.exit(1)
})
