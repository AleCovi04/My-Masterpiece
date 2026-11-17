import { useLayoutEffect, useRef, useState } from 'react'
import { niceMax } from '../../lib/analysis'

export interface BarStack {
  key: string
  /** Colore CSS, da una variabile del tema. */
  color: string
  values: number[]
}

interface Props {
  label: string
  /** Etichette dell'asse X, una per intervallo. */
  ticks: string[]
  /** Descrizione dell'intervallo per il tooltip. */
  titles: string[]
  stacks: BarStack[]
  /** Totale pianificato per intervallo, disegnato tratteggiato. */
  planned?: number[]
  /** Testo dei valori (asse Y e tooltip). */
  format: (v: number) => string
}

const H = 220
const L = 44
const R = 8
const T = 12
const B = 28
const PH = H - T - B

/** Barre impilate per intervallo, con il pianificato tratteggiato sopra. */
export default function BarChart({
  label,
  ticks,
  titles,
  stacks,
  planned,
  format,
}: Props) {
  // si disegna alla larghezza reale del contenitore: testi sempre a grandezza naturale
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(520)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    if (el.clientWidth) setW(Math.max(240, el.clientWidth))
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) =>
      setW(Math.max(240, Math.round(e.contentRect.width))),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const n = ticks.length
  const totals = ticks.map((_, i) =>
    stacks.reduce((a, s) => a + s.values[i], 0),
  )
  const top = Math.max(0, ...totals, ...(planned ?? []))
  const { max, step } = niceMax(top)
  const y = (v: number) => T + PH - (v / max) * PH
  const slot = (W - L - R) / Math.max(1, n)
  const bw = Math.max(2, Math.min(28, slot * 0.62))
  // al più un'etichetta ogni ~44 px
  const every = Math.max(1, Math.ceil(44 / slot))
  const lines = Math.round(max / step)

  return (
    <div ref={box} className="ana-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={label}
        className="chart-svg"
      >
        {Array.from({ length: lines + 1 }, (_, i) => {
          const v = i * step
          return (
            <g key={i}>
              <line
                x1={L}
                x2={W - R}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--line)"
              />
              <text
                x={L - 6}
                y={y(v) + 4}
                fontSize="11"
                fill="var(--muted)"
                textAnchor="end"
              >
                {format(v)}
              </text>
            </g>
          )
        })}
        {ticks.map((tick, i) => {
          const cx = L + slot * (i + 0.5)
          let acc = 0
          const p = planned?.[i] ?? 0
          return (
            <g key={i}>
              <title>
                {`${titles[i]} · ${format(totals[i])}${planned ? ` / ${format(p)}` : ''}`}
              </title>
              <rect
                x={cx - slot / 2}
                y={T}
                width={slot}
                height={PH}
                fill="transparent"
              />
              {stacks.map((s) => {
                const v = s.values[i]
                if (v <= 0) return null
                const y0 = y(acc)
                acc += v
                const y1 = y(acc)
                return (
                  <rect
                    key={s.key}
                    x={cx - bw / 2}
                    y={y1}
                    width={bw}
                    height={Math.max(0, y0 - y1)}
                    fill={s.color}
                  />
                )
              })}
              {planned && p > 0 && (
                <line
                  x1={cx - bw / 2 - 3}
                  x2={cx + bw / 2 + 3}
                  y1={y(p)}
                  y2={y(p)}
                  stroke="var(--text)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              )}
              {i % every === 0 && (
                <text
                  x={cx}
                  y={H - 9}
                  fontSize="11"
                  fill="var(--muted)"
                  textAnchor="middle"
                >
                  {tick}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
