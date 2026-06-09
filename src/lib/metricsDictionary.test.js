import { describe, it, expect } from 'vitest'
import { METRICS, getMetric } from './metricsDictionary'

const REQUIRED_KEYS = [
  'invest', 'results', 'cpl', 'conversionRate', 'roas',
  'ctrLink', 'cpcLink', 'cpm', 'frequency', 'reach', 'videoRetention', 'qualityRanking',
  'ctr', 'cpcAvg', 'impressionShare', 'isLostBudget', 'isLostRank', 'topShare', 'qualityScore', 'searchTerms',
]

describe('metricsDictionary', () => {
  it('has every required metric with label + definition', () => {
    for (const k of REQUIRED_KEYS) {
      expect(METRICS[k], `missing ${k}`).toBeTruthy()
      expect(METRICS[k].label, `${k}.label`).toBeTruthy()
      expect(METRICS[k].definition, `${k}.definition`).toBeTruthy()
    }
  })
  it('getMetric returns a safe fallback for unknown keys', () => {
    const m = getMetric('does-not-exist')
    expect(m.label).toBe('does-not-exist')
    expect(m.definition).toBe('')
  })
})
