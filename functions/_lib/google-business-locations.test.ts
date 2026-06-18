import { describe, expect, it } from 'vitest'
import { parseLocations, fetchLocations } from './google-business-locations'

const body = {
  locations: [
    { name: 'locations/111', title: 'P12 Centro', storefrontAddress: { locality: 'São Paulo', administrativeArea: 'SP' } },
    { name: 'locations/222', title: 'P12 Zona Sul', storefrontAddress: { locality: 'São Paulo' } },
  ],
}

describe('parseLocations', () => {
  it('extrai id, label e endereço', () => {
    const items = parseLocations(body)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ id: '111', label: 'P12 Centro', address: 'São Paulo, SP' })
    expect(items[1].address).toBe('São Paulo')
  })
})

describe('fetchLocations', () => {
  it('chama Business Information API com readMask', async () => {
    let url = ''
    const httpGet = async (u: string) => {
      url = u
      return { ok: true, status: 200, json: body }
    }
    const p = await fetchLocations(httpGet, 'acc1')
    expect(url).toContain('mybusinessbusinessinformation.googleapis.com/v1/accounts/acc1/locations')
    expect(url).toContain('readMask=')
    expect(p.items).toHaveLength(2)
  })
})
