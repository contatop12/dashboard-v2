export type IgGraphTokenResolve = {
  token: string
  pageId: string | null
  pageName: string | null
  source: 'user' | 'page'
}

type PageRow = {
  id?: string
  name?: string
  access_token?: string
  instagram_business_account?: { id?: string }
}

async function fetchPageRows(url: string): Promise<PageRow[]> {
  const rows: PageRow[] = []
  let next: string | null = url
  for (let page = 0; page < 10 && next; page++) {
    const r = await fetch(next)
    const j = (await r.json()) as {
      data?: PageRow[]
      paging?: { next?: string }
      error?: { message?: string }
    }
    if (!r.ok || j.error) break
    rows.push(...(j.data ?? []))
    next = j.paging?.next ?? null
  }
  return rows
}

function matchIgPage(rows: PageRow[], igUserId: string): PageRow | null {
  for (const row of rows) {
    if (String(row.instagram_business_account?.id ?? '').trim() === igUserId) return row
  }
  return null
}

/**
 * Instagram Graph API exige token da Página Facebook ligada ao perfil IG quando possível.
 * Fallback: token de usuário original.
 */
export async function resolveInstagramGraphToken(
  userToken: string,
  igUserId: string,
  businessId?: string | null
): Promise<IgGraphTokenResolve> {
  const fallback: IgGraphTokenResolve = {
    token: userToken,
    pageId: null,
    pageName: null,
    source: 'user',
  }

  try {
    const mePages = await fetchPageRows(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&limit=100&access_token=${encodeURIComponent(userToken)}`
    )
    const fromMe = matchIgPage(mePages, igUserId)
    if (fromMe?.access_token) {
      return {
        token: fromMe.access_token,
        pageId: String(fromMe.id ?? '').trim() || null,
        pageName: String(fromMe.name ?? '').trim() || null,
        source: 'page',
      }
    }

    const biz = businessId?.trim()
    if (biz) {
      for (const edge of ['owned_pages', 'client_pages'] as const) {
        const bizPages = await fetchPageRows(
          `https://graph.facebook.com/v21.0/${biz}/${edge}?fields=id,name,access_token,instagram_business_account&limit=100&access_token=${encodeURIComponent(userToken)}`
        )
        const fromBiz = matchIgPage(bizPages, igUserId)
        if (fromBiz?.access_token) {
          return {
            token: fromBiz.access_token,
            pageId: String(fromBiz.id ?? '').trim() || null,
            pageName: String(fromBiz.name ?? '').trim() || null,
            source: 'page',
          }
        }
      }
    }
  } catch {
    /* fallback user token */
  }

  return fallback
}
