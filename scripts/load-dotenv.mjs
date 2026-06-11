import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

/** Carrega .env da raiz do projeto em process.env (sem sobrescrever valores já definidos). */
export function loadDotEnv(rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')) {
  const envPath = path.join(rootDir, '.env')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
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
    if (process.env[key] === undefined) process.env[key] = val
  }
  if (!process.env.CLOUDFLARE_ACCOUNT_ID && process.env.ID_ACCOUNT_CLOUDFLARE) {
    process.env.CLOUDFLARE_ACCOUNT_ID = process.env.ID_ACCOUNT_CLOUDFLARE
  }
}
