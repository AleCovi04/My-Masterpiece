import { useSyncExternalStore } from 'react'

/** Segue una media query CSS (es. `(hover: hover) and (pointer: fine)`). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mq = window.matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () =>
      typeof window !== 'undefined' && !!window.matchMedia
        ? window.matchMedia(query).matches
        : false,
    () => false,
  )
}
