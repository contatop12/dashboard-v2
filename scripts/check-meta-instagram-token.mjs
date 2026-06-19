#!/usr/bin/env node
/**
 * Diagnóstico do token Meta para Instagram.
 * Uso: node scripts/check-meta-instagram-token.mjs [ig_user_id]
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const envPath = path.join(root, '.env')
const igId = process.argv[2]?.trim() || ''

function loadEnv() {
  if (!fs.existsSync(envPath)) {
    console.error('Arquivo .env não encontrado.')
    process.exit(1)
  }
  const out = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i === -1) continue
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return out
}

async function main() {
  const env = loadEnv()
  const token = env.META_ACCESS_TOKEN
  if (!token) {
    console.error('META_ACCESS_TOKEN ausente no .env')
    process.exit(1)
  }

  const targetIg = igId || env.META_INSTAGRAM_USER_ID || '17841444805076381'

  const debug = await (
    await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`
    )
  ).json()

  const scopes = debug.data?.scopes ?? []
  const required = ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement']
  const missing = required.filter((s) => !scopes.includes(s))

  console.log('App:', debug.data?.application, '| válido:', debug.data?.is_valid)
  console.log('Scopes atuais:', scopes.join(', ') || '(nenhum)')
  console.log('Scopes faltando p/ Instagram insights:', missing.length ? missing.join(', ') : 'nenhum')

  const prof = await (
    await fetch(
      `https://graph.facebook.com/v21.0/${targetIg}?fields=username,followers_count&access_token=${encodeURIComponent(token)}`
    )
  ).json()

  if (prof.error) {
    console.log('Perfil IG:', prof.error.message)
  } else {
    console.log('Perfil IG:', `@${prof.username}`, '| seguidores:', prof.followers_count)
  }

  const since = Math.floor(Date.now() / 1000 - 30 * 86400)
  const until = Math.floor(Date.now() / 1000)
  const ins = await (
    await fetch(
      `https://graph.facebook.com/v21.0/${targetIg}/insights?metric=reach&period=day&since=${since}&until=${until}&access_token=${encodeURIComponent(token)}`
    )
  ).json()

  if (ins.error) {
    console.log('Insights reach:', ins.error.message)
  } else {
    console.log('Insights reach: OK', `(dias: ${ins.data?.[0]?.values?.length ?? 0})`)
  }

  if (missing.length > 0) {
    console.log('\nComo corrigir:')
    console.log('1. Abra https://developers.facebook.com/tools/explorer/')
    console.log('2. Selecione o app Meta correto (o mesmo do token atual)')
    console.log('3. Em Permissions, marque:', required.join(', '))
    console.log('4. Generate Access Token → autorize a Página ligada ao Instagram')
    console.log('5. Atualize META_ACCESS_TOKEN no .env e rode: npm run cf:secrets:sync')
    process.exit(2)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
