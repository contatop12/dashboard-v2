/**
 * Lê DASHBOARD_AUTH_USERS do .env e insere super_admin no D1 (idempotente por e-mail).
 * Uso: npm run db:seed
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const PBKDF2_ITERATIONS = 100_000

function parseDotEnv(content) {
  const env = {}
  for (let line of content.split(/\r?\n/)) {
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

function sqlQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`
}

function bytesToHex(buf) {
  return [...buf].map(b => b.toString(16).padStart(2, '0')).join('')
}

const envPath = path.join(root, '.env')
if (!fs.existsSync(envPath)) {
  console.error('Arquivo .env não encontrado na raiz do projeto.')
  process.exit(1)
}

const raw = fs.readFileSync(envPath, 'utf8')
const env = parseDotEnv(raw)
let usersRaw = env.DASHBOARD_AUTH_USERS
if (!usersRaw) {
  console.error('Defina DASHBOARD_AUTH_USERS no .env (JSON array com email e password).')
  process.exit(1)
}

let users
try {
  users = JSON.parse(usersRaw)
} catch {
  console.error('DASHBOARD_AUTH_USERS deve ser um JSON válido.')
  process.exit(1)
}

if (!Array.isArray(users) || users.length === 0) {
  console.error('DASHBOARD_AUTH_USERS deve ser um array não vazio.')
  process.exit(1)
}

const statements = []
for (const u of users) {
  const email = String(u.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(u.password ?? '')
  if (!email || !password) continue

  const id = crypto.randomUUID()
  const salt = crypto.randomBytes(16)
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256')
  const saltHex = sqlQuote(bytesToHex(salt))
  const hashHex = sqlQuote(bytesToHex(hash))

  statements.push(
    `INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, name) VALUES (${sqlQuote(id)}, ${sqlQuote(email)}, ${hashHex}, ${saltHex}, 'super_admin', NULL);`
  )
}

if (statements.length === 0) {
  console.error('Nenhum usuário válido em DASHBOARD_AUTH_USERS.')
  process.exit(1)
}

const tmpDir = path.join(root, '.tmp')
fs.mkdirSync(tmpDir, { recursive: true })
const sqlFile = path.join(tmpDir, 'seed_super_admin.sql')
fs.writeFileSync(sqlFile, statements.join('\n'), 'utf8')

console.log(`Gerado ${sqlFile} (${statements.length} INSERT(s)). Aplicando em D1 remoto...`)

execSync(`npx wrangler d1 execute p12-dashboard --remote --file="${sqlFile}"`, {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

console.log('Seed concluído.')
