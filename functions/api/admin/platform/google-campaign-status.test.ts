import { describe, expect, test } from 'vitest'
import { normalizeGoogleMutateStatus, buildGoogleMutateRequest } from './google-campaign-status'

describe('normalizeGoogleMutateStatus', () => {
  test('ACTIVE vira ENABLED', () => expect(normalizeGoogleMutateStatus('ACTIVE')).toBe('ENABLED'))
  test('PAUSED mantém', () => expect(normalizeGoogleMutateStatus('PAUSED')).toBe('PAUSED'))
  test('inválido vira null', () => expect(normalizeGoogleMutateStatus('REMOVED')).toBeNull())
})

describe('buildGoogleMutateRequest', () => {
  test('campaign', () => {
    const r = buildGoogleMutateRequest('v20', '123', 'campaign', '55', 'ENABLED')
    expect(r).not.toBeNull()
    expect(r!.url).toBe('https://googleads.googleapis.com/v20/customers/123/campaigns:mutate')
    expect(r!.body).toEqual({
      operations: [
        { update: { resourceName: 'customers/123/campaigns/55', status: 'ENABLED' }, updateMask: 'status' },
      ],
    })
  })

  test('adset vira adGroups', () => {
    const r = buildGoogleMutateRequest('v20', '123', 'adset', '66', 'PAUSED')
    expect(r!.url).toContain('/adGroups:mutate')
    expect(r!.body.operations[0].update.resourceName).toBe('customers/123/adGroups/66')
  })

  test('ad exige id composto e vira adGroupAds', () => {
    const r = buildGoogleMutateRequest('v20', '123', 'ad', '66~99', 'PAUSED')
    expect(r!.url).toContain('/adGroupAds:mutate')
    expect(r!.body.operations[0].update.resourceName).toBe('customers/123/adGroupAds/66~99')
  })

  test('ad sem ~ é inválido', () => {
    expect(buildGoogleMutateRequest('v20', '123', 'ad', '99', 'PAUSED')).toBeNull()
  })

  test('id não numérico é inválido', () => {
    expect(buildGoogleMutateRequest('v20', '123', 'campaign', '55; DROP', 'PAUSED')).toBeNull()
  })
})
