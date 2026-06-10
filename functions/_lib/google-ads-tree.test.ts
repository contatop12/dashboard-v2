import { describe, expect, test } from 'vitest'
import {
  mapGoogleStatus,
  parseCampaignNodes,
  parseAdGroupNodes,
  parseAdNodes,
  buildGoogleTree,
} from './google-ads-tree'

describe('mapGoogleStatus', () => {
  test('ENABLED vira ACTIVE', () => expect(mapGoogleStatus('ENABLED')).toBe('ACTIVE'))
  test('PAUSED mantém', () => expect(mapGoogleStatus('PAUSED')).toBe('PAUSED'))
  test('desconhecido passa adiante', () => expect(mapGoogleStatus('REMOVED')).toBe('REMOVED'))
})

const campCatalog = [
  { campaign: { id: '1', name: 'Camp A', status: 'ENABLED', advertisingChannelType: 'SEARCH' } },
]
const campMetrics = [
  {
    campaign: { id: '1' },
    metrics: { costMicros: '2000000', impressions: '100', clicks: '10', conversions: '2' },
  },
]

describe('parseCampaignNodes', () => {
  test('merge catálogo + métricas', () => {
    const nodes = parseCampaignNodes(campCatalog, campMetrics)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      id: '1',
      name: 'Camp A',
      effectiveStatus: 'ACTIVE',
      objective: 'SEARCH',
      parentId: null,
    })
    expect(nodes[0].metrics.spend).toBe(2)
    expect(nodes[0].metrics.results).toBe(2)
    expect(nodes[0].metrics.ctrLink).toBeCloseTo(10)
  })

  test('campanha sem métricas no período entra zerada', () => {
    const nodes = parseCampaignNodes(campCatalog, [])
    expect(nodes[0].metrics.spend).toBe(0)
  })
})

describe('parseAdGroupNodes / parseAdNodes', () => {
  test('adGroup aponta pra campanha', () => {
    const nodes = parseAdGroupNodes(
      [{ adGroup: { id: '11', name: 'AG', status: 'PAUSED' }, campaign: { id: '1' } }],
      []
    )
    expect(nodes[0]).toMatchObject({ id: '11', parentId: '1', effectiveStatus: 'PAUSED' })
  })

  test('ad usa id composto adGroupId~adId', () => {
    const nodes = parseAdNodes(
      [
        {
          adGroupAd: { status: 'ENABLED', ad: { id: '99', name: 'Ad X' } },
          adGroup: { id: '11' },
        },
      ],
      []
    )
    expect(nodes[0]).toMatchObject({ id: '11~99', name: 'Ad X', parentId: '11' })
  })
})

describe('buildGoogleTree', () => {
  test('monta hierarquia completa', () => {
    const tree = buildGoogleTree(
      parseCampaignNodes(campCatalog, campMetrics),
      parseAdGroupNodes([{ adGroup: { id: '11', name: 'AG', status: 'ENABLED' }, campaign: { id: '1' } }], []),
      parseAdNodes(
        [{ adGroupAd: { status: 'ENABLED', ad: { id: '99', name: 'Ad X' } }, adGroup: { id: '11' } }],
        []
      )
    )
    expect(tree).toHaveLength(1)
    expect(tree[0].adsets).toHaveLength(1)
    expect(tree[0].adsets[0].ads).toHaveLength(1)
  })
})
