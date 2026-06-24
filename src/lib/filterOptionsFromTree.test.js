import { describe, expect, test } from 'vitest'
import { applyNameContainsToTree, filterOptionsFromTree, resolveTreeSlice } from './filterOptionsFromTree'

const tree = [
  {
    id: '1', name: 'Camp A', objective: 'OUTCOME_LEADS', effectiveStatus: 'ACTIVE',
    adsets: [
      {
        id: '11', name: 'Set 1',
        ads: [{ id: '111', name: 'Ad 1' }],
        keywords: [{ id: '11~kw1', keyword: 'cyrela sp' }],
      },
      { id: '12', name: 'Set 2', ads: [] },
    ],
  },
  { id: '2', name: 'Camp B', objective: 'OUTCOME_TRAFFIC', effectiveStatus: 'PAUSED', adsets: [] },
]

describe('filterOptionsFromTree', () => {
  test('extrai campanhas, filhos e objetivos', () => {
    const o = filterOptionsFromTree(tree)
    expect(o.campanha).toEqual([
      { id: '1', name: 'Camp A' },
      { id: '2', name: 'Camp B' },
    ])
    expect(o.children).toEqual([
      { id: '11', name: 'Set 1', campaignId: '1' },
      { id: '12', name: 'Set 2', campaignId: '1' },
    ])
    expect(o.ads).toEqual([{ id: '111', name: 'Ad 1', adsetId: '11', campaignId: '1' }])
    expect(o.objetivo).toEqual([
      { id: 'OUTCOME_LEADS', name: 'OUTCOME_LEADS', campaignIds: ['1'] },
      { id: 'OUTCOME_TRAFFIC', name: 'OUTCOME_TRAFFIC', campaignIds: ['2'] },
    ])
  })

  test('extrai palavras-chave quando includeKeywords', () => {
    const o = filterOptionsFromTree(tree, { includeKeywords: true })
    expect(o.keywords).toEqual([
      { id: '11~kw1', name: 'cyrela sp', adsetId: '11', campaignId: '1' },
    ])
  })

  test('objetivo com rótulos customizados', () => {
    const o = filterOptionsFromTree(
      [{ id: '1', name: 'S', objective: 'SEARCH', adsets: [] }],
      { objectiveLabels: { SEARCH: 'Search' } }
    )
    expect(o.objetivo[0].name).toBe('Search')
  })
})

describe('resolveTreeSlice', () => {
  test('sem filtros retorna árvore inteira', () => {
    expect(resolveTreeSlice(tree, {})).toHaveLength(2)
  })

  test('filtra por campanha', () => {
    const out = resolveTreeSlice(tree, { campanha: { id: '1' } })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('1')
  })

  test('filtra por filho (adset/grupo) mantendo só o ramo', () => {
    const out = resolveTreeSlice(tree, { children: { id: '12' } })
    expect(out).toHaveLength(1)
    expect(out[0].adsets).toHaveLength(1)
    expect(out[0].adsets[0].id).toBe('12')
  })

  test('filtra por anúncio', () => {
    const out = resolveTreeSlice(tree, { ads: { id: '111' } })
    expect(out).toHaveLength(1)
    expect(out[0].adsets[0].ads).toHaveLength(1)
  })

  test('filtra por objetivo via campaignIds', () => {
    const out = resolveTreeSlice(tree, { objetivo: { id: 'OUTCOME_TRAFFIC', campaignIds: ['2'] } })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('2')
  })

  test('filtra por status da campanha', () => {
    const out = resolveTreeSlice(tree, { status: { id: 'ACTIVE' } })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('1')
  })

  test('filtra campanhas com erros (campanha ou filhos reprovados)', () => {
    const withError = [
      ...tree,
      {
        id: '3',
        name: 'Camp OK com ad ruim',
        effectiveStatus: 'ACTIVE',
        adsets: [
          {
            id: '31',
            name: 'Grupo',
            effectiveStatus: 'ACTIVE',
            ads: [{ id: '311', name: 'Ad', effectiveStatus: 'DISAPPROVED' }],
          },
        ],
      },
      { id: '4', name: 'Camp Reprovada', effectiveStatus: 'DISAPPROVED', adsets: [] },
    ]
    const out = resolveTreeSlice(withError, { status: { id: 'ERROR' } })
    expect(out.map((c) => c.id).sort()).toEqual(['3', '4'])
  })

  test('filtra por palavra-chave', () => {
    const out = resolveTreeSlice(tree, { keywords: { id: '11~kw1' } })
    expect(out).toHaveLength(1)
    expect(out[0].adsets[0].keywords).toHaveLength(1)
    expect(out[0].adsets[0].keywords[0].keyword).toBe('cyrela sp')
  })

  test('filtra por palavra no título da campanha', () => {
    const out = resolveTreeSlice(tree, { nameContains: { level: 'campanha', text: 'camp a' } })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('1')
    expect(out[0].adsets).toHaveLength(2)
  })

  test('filtra por palavra no título do conjunto', () => {
    const out = resolveTreeSlice(tree, { nameContains: { level: 'children', text: 'set 1' } })
    expect(out).toHaveLength(1)
    expect(out[0].adsets).toHaveLength(1)
    expect(out[0].adsets[0].id).toBe('11')
  })

  test('filtra por palavra no título do anúncio', () => {
    const out = resolveTreeSlice(tree, { nameContains: { level: 'ads', text: 'ad 1' } })
    expect(out).toHaveLength(1)
    expect(out[0].adsets[0].ads).toHaveLength(1)
    expect(out[0].adsets[0].ads[0].id).toBe('111')
  })

  test('nameContains é case-insensitive', () => {
    const out = resolveTreeSlice(tree, { nameContains: { level: 'campanha', text: 'CYRELA' } })
    expect(out).toHaveLength(0)
    const out2 = resolveTreeSlice(
      [
        {
          id: '9',
          name: 'Cyrela SP',
          adsets: [{ id: '91', name: 'Grupo', ads: [] }],
        },
      ],
      { nameContains: { level: 'campanha', text: 'CYRELA' } }
    )
    expect(out2).toHaveLength(1)
    expect(out2[0].id).toBe('9')
  })
})

describe('applyNameContainsToTree', () => {
  test('sem texto retorna árvore inalterada', () => {
    expect(applyNameContainsToTree(tree, { level: 'campanha', text: '' })).toHaveLength(2)
    expect(applyNameContainsToTree(tree, null)).toHaveLength(2)
  })
})
