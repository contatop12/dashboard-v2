# dashboard-v2

SPA React (Vite) com rotas `/api/*` geradas a partir de **`functions/`** (fluxo Pages Functions → bundle Worker) e **D1**.

## Deploy no Cloudflare (Workers Builds + Git)

O projeto segue o guia **Migrate Pages to Workers** (MCP Cloudflare `migrate_pages_to_workers_guide`): o **`npm run build`** gera `dist/` + `dist/_worker.js/` via `wrangler pages functions build`, e o **`wrangler.toml`** define `main` + `[assets]` para **`npx wrangler deploy`** (comando padrão do Workers Builds).

1. **Build command:** `npm run build`
2. **Deploy command:** pode permanecer o padrão `npx wrangler deploy` ou `npm run deploy` (equivalente).

### Branches de preview

Se builds em branches não-produção usarem `npx wrangler versions upload`, isso deve funcionar com este `wrangler.toml` (Worker + assets). Ajuste só se a Cloudflare pedir flags extras.

## Desenvolvimento local

- `npm run dev` — Vite (proxy `/api` → `localhost:8788` via [`vite.config.js`](vite.config.js)).
- `npm run dev:cf` — `npm run build` + `wrangler dev` na porta **8788**.

Variáveis sensíveis: copie [`.dev.vars.example`](.dev.vars.example) para `.dev.vars` (não commitado).

## Banco (D1)

O `database_id` em [`wrangler.toml`](wrangler.toml) deve ser o D1 da **mesma conta** que o Workers Builds (`account_id`). Após trocar de conta, rode de novo:

- `npm run db:migrate` — schema remoto
- `npm run db:seed` — super admin a partir de `DASHBOARD_AUTH_USERS` no `.env`

Local: `db:migrate:local`.
