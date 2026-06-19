import { describe, expect, it } from 'vitest'
import {
  parseLeadsFromRow,
  parseObjectiveResults,
  parseThruPlayFromRow,
  sumInsightActions,
} from './meta-conversions'

describe('parseLeadsFromRow', () => {
  it('usa action lead agregada quando presente', () => {
    const n = parseLeadsFromRow({
      actions: [
        { action_type: 'lead', value: '17' },
        { action_type: 'onsite_conversion.lead_grouped', value: '17' },
        { action_type: 'leadgen_grouped', value: '15' },
      ],
    })
    expect(n).toBe(17)
  })

  it('não conta landing_page_view como lead', () => {
    const n = parseLeadsFromRow({
      actions: [
        { action_type: 'onsite_conversion.landing_page_view', value: '31' },
        { action_type: 'lead', value: '17' },
      ],
    })
    expect(n).toBe(17)
  })

  it('não conta todas onsite_conversion como lead (bug antigo)', () => {
    const n = parseLeadsFromRow({
      actions: [
        { action_type: 'onsite_conversion.landing_page_view', value: '31' },
        { action_type: 'onsite_conversion.messaging_first_reply', value: '50' },
        { action_type: 'onsite_conversion.lead_grouped', value: '15' },
      ],
    })
    expect(n).toBe(15)
  })

  it('fallback soma tipos de lead específicos sem lead agregado', () => {
    const n = parseLeadsFromRow({
      actions: [
        { action_type: 'leadgen_grouped', value: '15' },
        { action_type: 'offsite_conversion.fb_pixel_lead', value: '2' },
      ],
    })
    expect(n).toBe(17)
  })
})

describe('parseObjectiveResults', () => {
  it('lê objective_results', () => {
    const n = parseObjectiveResults({
      objective_results: [{ value: '42' }],
    })
    expect(n).toBe(42)
  })

  it('lê conversions', () => {
    const n = parseObjectiveResults({
      conversions: [{ action_type: 'landing_page_view', value: '31' }],
    })
    expect(n).toBe(31)
  })
})

describe('parseThruPlayFromRow', () => {
  it('usa video_thruplay_watched_actions', () => {
    expect(
      parseThruPlayFromRow({
        video_thruplay_watched_actions: [{ action_type: 'video_view', value: '4127' }],
      })
    ).toBe(4127)
  })

  it('deriva de cost_per_thruplay quando campo de vídeo ausente', () => {
    expect(
      parseThruPlayFromRow(
        { cost_per_thruplay: [{ action_type: 'video_view', value: '0.02' }] },
        82.54
      )
    ).toBe(4127)
  })
})

describe('sumInsightActions', () => {
  it('lê landing_page_view em conversions', () => {
    expect(
      sumInsightActions(
        { conversions: [{ action_type: 'onsite_conversion.landing_page_view', value: '31' }] },
        (t) => t.includes('landing_page_view')
      )
    ).toBe(31)
  })
})
