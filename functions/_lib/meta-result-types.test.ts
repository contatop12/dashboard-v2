import { describe, expect, it } from 'vitest'
import {
  buildResultsByTypeFromRow,
  parseResultCountFromRow,
  META_RESULT_TYPE_OPTIONS,
} from './meta-result-types'

describe('meta-result-types', () => {
  it('expõe a maioria dos tipos do Gerenciador de Anúncios', () => {
    expect(META_RESULT_TYPE_OPTIONS.length).toBeGreaterThanOrEqual(20)
    expect(META_RESULT_TYPE_OPTIONS.some((o) => o.id === 'thruplay')).toBe(true)
    expect(META_RESULT_TYPE_OPTIONS.some((o) => o.id === 'add_to_cart')).toBe(true)
    expect(META_RESULT_TYPE_OPTIONS.some((o) => o.id === 'complete_registration')).toBe(true)
  })

  it('parseResultCountFromRow usa inline_link_clicks para link_click', () => {
    const n = parseResultCountFromRow(
      { inline_link_clicks: '42', actions: [] },
      'link_click',
      {}
    )
    expect(n).toBe(42)
  })

  it('buildResultsByTypeFromRow preenche todos os ids', () => {
    const row = {
      actions: [
        { action_type: 'lead', value: '3' },
        { action_type: 'omni_purchase', value: '2' },
        { action_type: 'landing_page_view', value: '10' },
      ],
      inline_link_clicks: '5',
    }
    const map = buildResultsByTypeFromRow(row, { linkClicks: 5, thruPlay: 7, hookViews: 11 })
    expect(map.leads).toBe(3)
    expect(map.purchases).toBe(2)
    expect(map.landing_page_view).toBe(10)
    expect(map.link_click).toBe(5)
    expect(map.thruplay).toBe(7)
    expect(map.video_view).toBe(11)
    expect(Object.keys(map).length).toBe(META_RESULT_TYPE_OPTIONS.length)
  })
})
