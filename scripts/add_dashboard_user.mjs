/**
 * Provisiona usuário no D1 (Cloudflare Access — senha é placeholder).
 * Uso:
 *   node scripts/add_dashboard_user.mjs --email danilo@p12digital.com.br --name "Danilo Puglisi" --role super_admin
 *   node scripts/add_dashboard_user.mjs --email ... --local   (D1 local)
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const PBKDF2_ITERATIONS = 100_000

function parseArgs(argv) {
  const out = { local: false, role: 'super_admin' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--local') out.local = true
    else if (a === '--email') out.email = argv[++i]
    else if (a === '--name') out.name = argv[++i]
    else if (a === '--role') out.role = argv[++i]
  }
  return out
}

function sqlQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`
}

function bytesToHex(buf) {
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const { email: rawEmail, name, role, local } = parseArgs(process.argv.slice(2))
const email = String(rawEmail ?? '')
  .trim()
  .toLowerCase()
const displayName = String(name ?? '').trim() || null
const userRole = role === 'client' ? 'client' : 'super_admin'

if (!email) {
  console.error('Uso: node scripts/add_dashboard_user.mjs --email EMAIL --name "Nome" [--role super_admin|client] [--local]')
  process.exit(1)
}

const id = crypto.randomUUID()
const salt = crypto.randomBytes(16)
const placeholderPassword = crypto.randomBytes(24).toString('base64url')
const hash = crypto.pbkdf2Sync(placeholderPassword, salt, PBKDF2_ITERATIONS, 32, 'sha256')

const sql = `
INSERT INTO users (id, email, password_hash, password_salt, role, name)
VALUES (
  ${sqlQuote(id)},
  ${sqlQuote(email)},
  ${sqlQuote(bytesToHex(hash))},
  ${sqlQuote(bytesToHex(salt))},
  ${sqlQuote(userRole)},
  ${displayName ? sqlQuote(displayName) : 'NULL'}
)
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  role = excluded.role,
  updated_at = datetime('now');
`.trim()

const tmpDir = path.join(root, '.tmp')
fs.mkdirSync(tmpDir, { recursive: true })
const sqlFile = path.join(tmpDir, `add_user_${email.replace(/[^a-z0-9]/g, '_')}.sql`)
fs.writeFileSync(sqlFile, sql, 'utf8')

const target = local ? '--local' : '--remote'
console.log(`Provisionando ${email} (${displayName || 'sem nome'}) como ${userRole} em D1 ${local ? 'local' : 'remoto'}...`)

execSync(`npx wrangler d1 execute p12-dashboard ${target} --file="${sqlFile}"`, {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

console.log('Usuário provisionado. Acesso via Cloudflare Access (e-mail deve estar em ACCESS_ALLOWED_EMAILS).')
