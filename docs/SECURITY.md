# Segurança — Dashboard P12

Camadas de proteção dos dados do dashboard (defesa em profundidade).

## 1. Cloudflare Access (Zero Trust) — identidade na borda

Coloca **todo o app** atrás de identidade: ninguém carrega a dashboard sem autenticar primeiro. Impede vazamento mesmo do HTML/JS.

**Pré-requisito:** o app precisa estar num **domínio custom** no Cloudflare (Access self-hosted não cobre `*.workers.dev`). Mapeie o Worker no domínio (ex.: `dashboard.p12digital.com.br`) antes.

### Provisionar (script)

```powershell
$env:CLOUDFLARE_API_TOKEN="<token com Access: Apps Edit, Policies Edit, Organizations Read>"
$env:CLOUDFLARE_ACCOUNT_ID="<account id>"
$env:ACCESS_APP_DOMAIN="dashboard.p12digital.com.br"
$env:ACCESS_ALLOWED_EMAIL_DOMAIN="p12digital.com.br"
node scripts/setup-cloudflare-access.mjs   # use DRY_RUN=1 para simular
```

O script é idempotente: cria/atualiza a Access Application (sessão **2h**, IdP Google, política que libera só `@p12digital.com.br`) e imprime os dois valores a setar no Worker.

### Provisionar (manual, alternativa)

Zero Trust → Access → Applications → Add → Self-hosted:
- **Application domain:** o domínio custom.
- **Session Duration:** 2 hours.
- **Identity providers:** Google (adicione antes em Settings → Authentication).
- **Policy:** Allow · Include · Emails ending in `@p12digital.com.br`.

### Ligar a verificação no Worker

Depois de criar a app, set as vars (o script imprime os valores):

```powershell
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN   # ex.: p12.cloudflareaccess.com
npx wrangler secret put CF_ACCESS_AUD           # AUD tag da Application
```

Com as duas setadas, o middleware ([functions/_middleware.ts](../functions/_middleware.ts)) valida o header `Cf-Access-Jwt-Assertion` em todo `/api/*` (RS256 contra o JWKS do time + checagem de `iss`/`aud`/`exp`). É **defesa em profundidade**: mesmo que a política de borda seja burlada, o Worker rejeita (403). Sem as vars, a verificação fica inerte (não quebra dev/local).

## 2. Sessão de 2 horas

[functions/_lib/session.ts](../functions/_lib/session.ts) — `SESSION_MAX_AGE_SEC = 2h`. Controla o `Max-Age` do cookie **e** o `sessions.expires_at` no D1. Login expira em 2h.

## 3. Security headers

[functions/_lib/security-headers.ts](../functions/_lib/security-headers.ts) — aplicados em **toda** resposta:

| Header | Valor | Protege contra |
|--------|-------|----------------|
| `Content-Security-Policy` | `default-src 'self'` + fontes restritas | XSS, injeção de recurso |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | downgrade HTTP |
| `X-Frame-Options` | `DENY` | clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | vazamento de URL |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | APIs de hardware |
| `Cross-Origin-Opener-Policy` | `same-origin` | cross-window leaks |

**CSP escape hatch:** se a CSP quebrar algo na SPA, set `CSP_DISABLED=1` no Worker temporariamente e ajuste a policy em `DEFAULT_CSP`. Teste a dashboard após o deploy (gráficos, fontes, thumbnails de criativos).

## 4. Cookie de sessão

`HttpOnly` + `SameSite=Lax` + `Secure` (em https) — [functions/_lib/session.ts](../functions/_lib/session.ts). `Lax` (não `Strict`) é necessário para o retorno do OAuth.

## Pendências (fora deste escopo)

- **Token Meta** (`ads_management`): o app Meta atual está "deleted" — o switch de pausar/ativar campanha só age após renovar o token. Não é bug do código.
- Rodar `node scripts/setup-cloudflare-access.mjs` exige o domínio custom já ativo no Cloudflare.
