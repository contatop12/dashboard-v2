# dashboard-v2

SPA React (Vite) com rotas `/api/*` geradas a partir de **`functions/`** (fluxo Pages Functions → bundle Worker) e **D1**.

## Deploy no Cloudflare (Workers Builds + Git)

O projeto segue o guia **Migrate Pages to Workers** (MCP Cloudflare `migrate_pages_to_workers_guide`): o **`npm run build`** gera `dist/` + `dist/_worker.js/` via `wrangler pages functions build`, e o **`wrangler.toml`** define `main` + `[assets]` para **`npx wrangler deploy`** (comando padrão do Workers Builds).

1. **Build command:** `npm run build`
2. **Deploy command:** pode permanecer o padrão `npx wrangler deploy` ou `npm run deploy` (equivalente).

### Branches de preview

Se builds em branches não-produção usarem `npx wrangler versions upload`, isso deve funcionar com este `wrangler.toml` (Worker + assets). Ajuste só se a Cloudflare pedir flags extras.

## Variáveis no Cloudflare (Worker)

| Tipo | Onde |
|------|------|
| Público / não sensível | Bloco `[vars]` no [`wrangler.toml`](wrangler.toml) |
| Senhas, tokens | **Secrets**: Dashboard → Workers & Pages → **dashboard-v2** → Settings → **Variables and Secrets**, ou CLI |

**Subir vários secrets de uma vez** (arquivo `.dev.vars` na raiz, já no `.gitignore`):

1. `npx wrangler login` na conta certa (`account_id` do `wrangler.toml`).
2. Copie [`.dev.vars.example`](.dev.vars.example) → `.dev.vars` e preencha.
3. `npm run cf:secrets` — usa `wrangler secret bulk .dev.vars`.

Listar secrets remotos: `npm run cf:secrets:list`.

Valores em `[vars]` aparecem em texto no dashboard; secrets são mascarados.

### OAuth (Meta + Google)

1. Defina **secrets** no Worker: `OAUTH_ENC_KEY` (Base64 de 32 bytes), `META_APP_ID`, `META_APP_SECRET`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, opcional `OAUTH_STATE_SECRET`.
2. **Redirect URIs** (produção e `http://localhost:8788` para dev):
   - `{ORIGEM}/api/oauth/meta/callback`
   - `{ORIGEM}/api/oauth/google/callback`
3. No app: **Configurações → Integrações** — escolha a organização e **Conectar**.

Um login **Meta** preenche contas de anúncios + Instagram Business (quando houver página com IG). Um login **Google** tenta listar clientes do Google Ads e contas do Business Profile.

## Desenvolvimento local

- `npm run dev` — Vite (proxy `/api` → `localhost:8788` via [`vite.config.js`](vite.config.js)).
- `npm run dev:cf` — `npm run build` + `wrangler dev` na porta **8788**.

Variáveis sensíveis: copie [`.dev.vars.example`](.dev.vars.example) para `.dev.vars` (não commitado).

## Banco (D1)

O `database_id` em [`wrangler.toml`](wrangler.toml) deve ser o D1 da **mesma conta** que o Workers Builds (`account_id`). Após trocar de conta, rode de novo:

- `npm run db:migrate` — schema remoto
- `npm run db:seed` — super admin a partir de `DASHBOARD_AUTH_USERS` no `.env`

Local: `db:migrate:local`.
