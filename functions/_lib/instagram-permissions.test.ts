import { describe, expect, it } from 'vitest'
import { igPermissionHelpMessage, isIgPermissionError } from './instagram-permissions'

describe('instagram-permissions', () => {
  it('detects Meta error #10', () => {
    expect(isIgPermissionError('(#10) Application does not have permission for this action')).toBe(true)
  })

  it('returns help message in Portuguese', () => {
    expect(igPermissionHelpMessage()).toContain('instagram_basic')
    expect(igPermissionHelpMessage()).toContain('instagram_manage_insights')
  })
})
