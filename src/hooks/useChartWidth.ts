import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Larghezza reale del contenitore del grafico: si disegna a quella misura,
 * così i testi restano a grandezza naturale sia a 390 px sia su desktop.
 */
export function useChartWidth(fallback = 520) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.clientWidth) setWidth(Math.max(240, el.clientWidth))
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) =>
      setWidth(Math.max(240, Math.round(e.contentRect.width))),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

/** Altezza del grafico: più alto quando c'è spazio (desktop). */
export const chartHeight = (width: number) =>
  width >= 900 ? 340 : width >= 600 ? 300 : 250
