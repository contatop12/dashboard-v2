# dashboard-v2

SPA React (Vite) com **Cloudflare Pages Functions** (`functions/`) e **D1**.

## Deploy no Cloudflare (Workers Builds + Git)

O log de CI mostra `Executing user deploy command: npx wrangler deploy` quando o painel ainda está com o **comando padrão**. Este repositório **não** é um Worker com `main`; o deploy correto é **Pages**.

1. Cloudflare Dashboard → **Workers & Pages** → selecione o worker/projeto ligado ao repo.
2. **Settings** → **Build** (configuração de build).
3. **Deploy command**: altere de `npx wrangler deploy` para:

   ```bash
   npm run deploy
   ```

   (equivale a `wrangler pages deploy dist --project-name=dashboard-v2`.)

4. Se o nome do projeto Pages no dashboard for diferente de `dashboard-v2`, ajuste o flag `--project-name` no script `deploy` em [`package.json`](package.json).

### Branches de preview (não produção)

Se você habilitou builds em branches que não são produção, o padrão costuma ser `npx wrangler versions upload`, o que também não serve a este app. Configure **Non-production branch deploy command** para algo como:

```bash
npx wrangler pages deploy dist --project-name=dashboard-v2 --branch=$WORKERS_CI_BRANCH
```

## Desenvolvimento local

- `npm run dev` — Vite (proxy `/api` → `localhost:8788` via [`vite.config.js`](vite.config.js)).
- `npm run dev:cf` — build + `wrangler pages dev` na porta 8788.

Variáveis sensíveis: copie [`.dev.vars.example`](.dev.vars.example) para `.dev.vars` (não commitado).

## Banco (D1)

- `npm run db:migrate` / `db:migrate:local`
- `npm run db:seed` — super admin a partir de `DASHBOARD_AUTH_USERS` no `.env`
