import { describe, expect, it } from 'vitest'
import { fetchGoogleBusinessAccounts, normalizeGmbAccountId } from './google-business-accounts'

describe('normalizeGmbAccountId', () => {
  it('remove prefixo accounts/', () => {
    expect(normalizeGmbAccountId('accounts/123')).toBe('123')
    expect(normalizeGmbAccountId('123')).toBe('123')
  })
})

describe('fetchGoogleBusinessAccounts', () => {
  it('pagina e inclui contas filhas de organização', async () => {
    const calls: string[] = []
    const httpGet = async (url: string) => {
      calls.push(url)
      if (url.includes('pageToken=page2')) {
        return {
          ok: true,
          status: 200,
          json: { accounts: [{ name: 'accounts/2', accountName: 'Conta B', type: 'PERSONAL' }] },
        }
      }
      if (url.includes('parentAccount=accounts%2Forg1')) {
        return {
          ok: true,
          status: 200,
          json: {
            accounts: [{ name: 'accounts/child1', accountName: 'Filha', type: 'LOCATION_GROUP' }],
          },
        }
      }
      return {
        ok: true,
        status: 200,
        json: {
          accounts: [{ name: 'accounts/org1', accountName: 'Org', type: 'ORGANIZATION' }],
          nextPageToken: 'page2',
        },
      }
    }

    const { accounts, error } = await fetchGoogleBusinessAccounts(httpGet)
    expect(error).toBeNull()
    expect(accounts.map((a) => a.id).sort()).toEqual(['2', 'child1', 'org1'])
    expect(calls.some((u) => u.includes('parentAccount=accounts%2Forg1'))).toBe(true)
  })
})
