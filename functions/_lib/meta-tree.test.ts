import { describe, it, expect } from 'vitest'
import { buildMetaTree, type MetaNodeInput } from './meta-tree'

const campaigns: MetaNodeInput[] = [
  { id: 'c1', name: 'Camp 1', effectiveStatus: 'ACTIVE', objective: 'LEADS', dailyBudget: 25, parentId: null, metrics: { spend: 248.14, results: 5, ctrLink: 2.08, cpm: 60.77 } },
]
const adsets: MetaNodeInput[] = [
  { id: 's1', name: 'Set 1', effectiveStatus: 'ACTIVE', objective: 'LEADS', dailyBudget: 35, parentId: 'c1', metrics: { spend: 248.14, results: 5, ctrLink: 2.08, cpm: 60.77 } },
  { id: 's-orphan', name: 'Orphan', effectiveStatus: 'PAUSED', objective: 'LEADS', dailyBudget: 0, parentId: 'missing', metrics: { spend: 0, results: 0, ctrLink: 0, cpm: 0 } },
]
const ads: MetaNodeInput[] = [
  { id: 'a1', name: 'AD001', effectiveStatus: 'ACTIVE', objective: 'LEADS', dailyBudget: 0, parentId: 's1', thumbnailUrl: 'http://x/t.jpg', metrics: { spend: 246.71, results: 5, ctrLink: 2.09, cpm: 60 } },
]

describe('buildMetaTree', () => {
  it('nests adsets under campaigns and ads under adsets', () => {
    const tree = buildMetaTree(campaigns, adsets, ads)
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('c1')
    expect(tree[0].adsets).toHaveLength(1)
    expect(tree[0].adsets[0].id).toBe('s1')
    expect(tree[0].adsets[0].ads).toHaveLength(1)
    expect(tree[0].adsets[0].ads[0].id).toBe('a1')
  })
  it('drops adsets whose parent campaign is missing', () => {
    const tree = buildMetaTree(campaigns, adsets, ads)
    const ids = tree.flatMap((c) => c.adsets.map((s) => s.id))
    expect(ids).not.toContain('s-orphan')
  })
  it('carries thumbnail + budget + objective through', () => {
    const tree = buildMetaTree(campaigns, adsets, ads)
    expect(tree[0].adsets[0].ads[0].thumbnailUrl).toBe('http://x/t.jpg')
    expect(tree[0].dailyBudget).toBe(25)
    expect(tree[0].objective).toBe('LEADS')
  })
})
