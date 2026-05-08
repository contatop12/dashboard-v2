# Account Discovery — Design Spec

## Goal

Discover and persist all Meta (BM) and Google accounts accessible to the super admin (via Worker env vars) and to each client (via OAuth tokens), using a two-stage approach: fast first-pass in the OAuth callback, deep scan on demand.

## Architecture

Two separate discovery paths, completely isolated in storage:

| Path | Trigger | Storage |
|------|---------|---------|
| Super admin (env vars) | Button "Descobrir contas" in admin UI | `admin_env_accounts` table |
| Client OAuth | 1st pass: OAuth callback; deep scan: "Atualizar" button | `connected_accounts` table |

## Database

### New table: `admin_env_accounts`

```sql
CREATE TABLE admin_env_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('meta_ads','instagram','google_ads','google_business')),
  external_id TEXT NOT NULL,
  external_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, external_id)
);
```

Zero foreign keys — completely isolated from `organizations` and `connected_accounts`.

### No changes to `connected_accounts` schema

The existing table already supports multiple accounts per org per provider.

## Worker Env Vars

Added to `worker-env.ts` and `.dev.vars`:
- `META_BUSINESS_ID` — BM ID for super admin discovery (value: `438294343676061`)

Run `npm run cf:secrets` after updating `.dev.vars` to push to Cloudflare production.

## API Endpoints

### `POST /api/admin/accounts/discover`
- Auth: `super_admin` only
- Uses env vars: `META_ACCESS_TOKEN`, `META_BUSINESS_ID`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`
- Meta discovery:
  - `/{META_BUSINESS_ID}/owned_ad_accounts?fields=name,account_id&limit=50`
  - `/{META_BUSINESS_ID}/client_ad_accounts?fields=name,account_id&limit=50`
  - `/{META_BUSINESS_ID}/owned_pages?fields=name,id&limit=50`
  - `/{META_BUSINESS_ID}/instagram_accounts?fields=id,username&limit=50`
- Google discovery:
  - Exchange `GOOGLE_ADS_REFRESH_TOKEN` → fresh access token
  - `POST customers:listAccessibleCustomers` → for each: GAQL to get `customer.descriptive_name`
  - `GET mybusinessaccountmanagement.googleapis.com/v1/accounts`
- Upsert all results into `admin_env_accounts`
- Returns `{ meta_ads: N, instagram: N, google_ads: N, google_business: N }`

### `GET /api/admin/accounts`
- Auth: `super_admin` only
- Returns all rows from `admin_env_accounts` grouped by provider

### `POST /api/orgs/{id}/accounts/refresh`
- Auth: user with org access or `super_admin`
- Reads OAuth credential from `oauth_credentials` WHERE `authorized_user_id` matches AND provider
- Decrypts access token (via `OAUTH_ENC_KEY`); refreshes if expired
- Meta deep scan:
  - `/me/businesses?limit=5` → for each BM:
    - `/{biz_id}/owned_ad_accounts?fields=name,account_id&limit=50`
    - `/{biz_id}/client_ad_accounts?fields=name,account_id&limit=50`
  - `/me/accounts?fields=name,instagram_business_account{id,username}&limit=50`
  - Upsert into `connected_accounts` (no wipe — preserves existing)
- Google deep scan:
  - `customers:listAccessibleCustomers` → resolve names via GAQL
  - `mybusinessaccountmanagement/v1/accounts`
  - Upsert into `connected_accounts`
- Returns `{ added: N, updated: M }`

## Callback Improvements (`callback.ts`)

### Meta (`finishMeta`)
- `/me/adaccounts` limit: 20 → 50
- Add BM first-pass: `/me/businesses?limit=5` → for each: `/owned_ad_accounts` + `/client_ad_accounts` (limit 20 each)
- `/me/accounts` (pages + IG) limit: 50

### Google (`finishGoogle`)
- `customers:listAccessibleCustomers` — remove `slice(0, 10)` → use all up to 50
- For each customer: GAQL `SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1` → replaces `"Cliente {id}"` with real name
- GMN: remove `slice(0, 10)` → use all up to 50

## New Helper: `functions/_lib/google-token-refresh.ts`

```typescript
export async function refreshGoogleAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string>
```

Used by:
- `POST /api/admin/accounts/discover` (env var refresh token)
- `POST /api/orgs/{id}/accounts/refresh` (D1 stored refresh token)

## UI Changes

### `src/pages/Conexoes.jsx`
- "Atualizar" button: after refreshing connection list, also calls `POST /api/orgs/{id}/accounts/refresh`
- Shows toast/feedback with count of accounts found

### `src/pages/Configuracoes.jsx` or admin section
- New card "Contas da empresa (BM)"
- Button "Descobrir contas" → `POST /api/admin/accounts/discover`
- Loading state + result: "Meta: N ad accounts, M Instagram; Google: P Ads, Q GMN"
- Read-only list of `admin_env_accounts` grouped by provider

## Error Handling

- Missing env vars: return 503 with specific message (which var is missing)
- Token exchange failure: log error, return 502 with provider message
- Individual account fetch failure: skip account, continue discovery (no abort)
- Timeout risk: each BM sub-call is bounded (limit=50); Cloudflare 30s limit accommodates up to ~5 BMs

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `migrations/0003_admin_env_accounts.sql` |
| Modify | `functions/_lib/worker-env.ts` — add `META_BUSINESS_ID` |
| Create | `functions/_lib/google-token-refresh.ts` |
| Modify | `functions/api/oauth/[provider]/callback.ts` — improve limits + BM first-pass + Google names |
| Create | `functions/api/admin/accounts/discover.ts` |
| Create | `functions/api/admin/accounts/index.ts` |
| Create | `functions/api/orgs/[id]/accounts/refresh.ts` |
| Modify | `src/pages/Conexoes.jsx` — call refresh endpoint on "Atualizar" |
| Modify | `src/pages/Configuracoes.jsx` — add BM discovery card |
