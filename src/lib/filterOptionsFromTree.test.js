import { describe, expect, test } from 'vitest'
import { filterOptionsFromTree, resolveTreeSlice } from './filterOptionsFromTree'

const tree = [
  {
    id: '1', name: 'Camp A', objective: 'OUTCOME_LEADS',
    adsets: [
      { id: '11', name: 'Set 1', ads: [{ id: '111', name: 'Ad 1' }] },
      { id: '12', name: 'Set 2', ads: [] },
    ],
  },
  { id: '2', name: 'Camp B', objective: 'OUTCOME_TRAFFIC', adsets: [] },
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
})
