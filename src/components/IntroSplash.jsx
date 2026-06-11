import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const INTRO_SEEN_KEY = 'p12_intro_seen'

export function hasSeenIntroThisSession() {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}

/**
 * Intro amarela — slide de baixo para cima ao entrar e sai subindo.
 * Pré-carregamento visual enquanto o dashboard monta atrás.
 */
export function IntroSplash({ onComplete }) {
  const [slideIn, setSlideIn] = useState(false)
  const [slideOut, setSlideOut] = useState(false)
  const [contentVisible, setContentVisible] = useState(false)

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      markIntroSeen()
      onComplete()
      return
    }

    const enterFrame = requestAnimationFrame(() => {
      setSlideIn(true)
      window.setTimeout(() => setContentVisible(true), 320)
    })

    const holdTimer = window.setTimeout(() => setSlideOut(true), 2400)
    const exitTimer = window.setTimeout(() => {
      markIntroSeen()
      onComplete()
    }, 3100)

    return () => {
      cancelAnimationFrame(enterFrame)
      window.clearTimeout(holdTimer)
      window.clearTimeout(exitTimer)
    }
  }, [onComplete])

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[200] overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label="Carregando P12 Dashboard"
    >
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center bg-brand px-6 transition-transform duration-700',
          !slideIn && 'translate-y-full',
          slideIn && !slideOut && 'translate-y-0 ease-out',
          slideOut && '-translate-y-full ease-in duration-500'
        )}
      >
        <div
          className={cn(
            'flex max-w-sm flex-col items-center gap-4 text-center transition-all duration-500',
            contentVisible && !slideOut ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F0F0F] shadow-lg">
            <Zap size={28} className="text-brand" fill="currentColor" />
          </div>
          <div className="space-y-1.5">
            <p className="font-display text-2xl font-bold tracking-tight text-[#0F0F0F]">P12 Dashboard</p>
            <p className="font-sans text-sm text-[#0F0F0F]/75">
              Sua visão consolidada de mídia paga
            </p>
          </div>
          <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-[#0F0F0F]/15">
            <div className="intro-progress-bar h-full rounded-full bg-[#0F0F0F]/45" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0F0F0F]/55">
            Carregando…
          </p>
        </div>
      </div>
    </div>
  )
}
