import { describe, expect, it } from 'vitest'
import {
  customerPathId,
  DEFAULT_GOOGLE_ADS_API_VERSION,
  mergeGoogleAdsAccountLists,
  resolveGoogleApiVersion,
  resolveGoogleLoginCustomerId,
} from '../../functions/_lib/google-ads-env'

describe('google-ads-env', () => {
  it('normaliza customer id', () => {
    expect(customerPathId('378-061-1396')).toBe('3780611396')
    expect(customerPathId('customers/1234567890')).toBe('1234567890')
  })

  it('usa MCC como login-customer-id fallback', () => {
    expect(
      resolveGoogleLoginCustomerId({ GOOGLE_ADS_MCC_ID: '3780611396' } as never)
    ).toBe('3780611396')
  })

  it('default api version v23', () => {
    expect(resolveGoogleApiVersion({} as never)).toBe(DEFAULT_GOOGLE_ADS_API_VERSION)
    expect(resolveGoogleApiVersion({ GOOGLE_ADS_API_VERSION: '24' } as never)).toBe('v24')
  })

  it('remapeia versões com sunset (v20 encerrou jun/2026)', () => {
    expect(resolveGoogleApiVersion({ GOOGLE_ADS_API_VERSION: 'v20' } as never)).toBe('v23')
    expect(resolveGoogleApiVersion({ GOOGLE_ADS_API_VERSION: '20' } as never)).toBe('v23')
    expect(resolveGoogleApiVersion({ GOOGLE_ADS_API_VERSION: 'v19' } as never)).toBe('v23')
  })

  it('merge deduplica e marca MCC', () => {
    const merged = mergeGoogleAdsAccountLists(
      [{ id: '3780611396', name: 'MCC' }],
      [
        { id: '9945524001', name: 'Cliente A', isManager: false },
        { id: '3780611396', name: 'MCC Manager', isManager: true },
      ],
      '3780611396'
    )
    expect(merged).toHaveLength(2)
    const mcc = merged.find((a) => a.id === '3780611396')
    expect(mcc?.isManager).toBe(true)
    expect(merged.find((a) => a.id === '9945524001')?.name).toBe('Cliente A')
  })
})
