import { describe, expect, it, beforeEach } from 'vitest'
import { hasSeenIntroThisSession, markIntroSeen } from './IntroSplash'

describe('IntroSplash helpers', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('marca intro como vista na sessão', () => {
    expect(hasSeenIntroThisSession()).toBe(false)
    markIntroSeen()
    expect(hasSeenIntroThisSession()).toBe(true)
  })
})
