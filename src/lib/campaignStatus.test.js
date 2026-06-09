import { describe, it, expect } from 'vitest'
import { mapEffectiveStatusToColor, STATUS_COLOR } from './campaignStatus'

describe('mapEffectiveStatusToColor', () => {
  it('maps ACTIVE to success', () => {
    expect(mapEffectiveStatusToColor('ACTIVE')).toBe(STATUS_COLOR.success)
  })
  it('maps problem statuses to danger', () => {
    for (const s of ['DISAPPROVED', 'WITH_ISSUES', 'PENDING_REVIEW', 'PENDING_BILLING_INFO']) {
      expect(mapEffectiveStatusToColor(s), s).toBe(STATUS_COLOR.danger)
    }
  })
  it('maps paused statuses to neutral', () => {
    for (const s of ['PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'ARCHIVED']) {
      expect(mapEffectiveStatusToColor(s), s).toBe(STATUS_COLOR.neutral)
    }
  })
  it('falls back to neutral for unknown/empty', () => {
    expect(mapEffectiveStatusToColor('')).toBe(STATUS_COLOR.neutral)
    expect(mapEffectiveStatusToColor('SOMETHING_NEW')).toBe(STATUS_COLOR.neutral)
  })
  it('is case-insensitive', () => {
    expect(mapEffectiveStatusToColor('active')).toBe(STATUS_COLOR.success)
  })
})
