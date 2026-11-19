import { useId, type PointerEvent } from 'react'
import type { SeriesPoint } from '../../lib/fit/analysis'
import { useChartWidth } from '../analysis/useChartWidth'

interface Props {
  label: string
  points: SeriesPoint[]
  /** Valore → testo (asse Y e cursore). */
  format: (v: number) => string
  /** Valore X → testo (asse e cursore). */
  formatX: (x: number) => string
  /** Passo: i valori più bassi (più veloci) stanno in alto. */
  invert?: boolean
  /** Scala dal minimo al massimo veri (quota), invece che senza gli estremi. */
  fullRange?: boolean
  /** Campione evidenziato (indice in `FitActivity.points`), condiviso con mappa e altri grafici. */
  hover: number | null
  onHover: (i: number | null) => void
}

const L = 46
const R = 10
const T = 10
const B = 22

const percentile = (sorted: number[], p: number) =>
  sorted[
    Math.min(
      sorted.length - 1,
      Math.max(0, Math.round((sorted.length - 1) * p)),
    )
  ]

/** Il punto della serie più vicino al campione `i`. */
function nearest(points: SeriesPoint[], i: number): number {
  let lo = 0
  let hi = points.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].i < i) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && Math.abs(points[lo - 1].i - i) < Math.abs(points[lo].i - i))
    return lo - 1
  return lo
}

/** Una metrica lungo l'attività: area e linea, cursore condiviso. */
export default function ActivityChart({
  label,
  points,
  format,
  formatX,
  invert,
  fullRange,
  hover,
  onHover,
}: Props) {
  const { ref, width: W } = useChartWidth()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const H = W >= 600 ? 170 : 140
  const PH = H - T - B
  if (points.length < 2) return null

  const ys = points.map((p) => p.y).sort((a, b) => a - b)
  let lo = fullRange ? ys[0] : percentile(ys, 0.02)
  let hi = fullRange ? ys[ys.length - 1] : percentile(ys, 0.98)
  // valori quasi costanti: almeno ±3 % attorno alla media, così l'asse si legge
  const minSpan = Math.max(1e-6, Math.abs((hi + lo) / 2) * 0.06)
  if (hi - lo < minSpan) {
    const mid = (hi + lo) / 2
    lo = mid - minSpan / 2
    hi = mid + minSpan / 2
  }
  const pad = (hi - lo) * 0.08
  lo -= pad
  hi += pad
  const x0 = points[0].x
  const x1 = points[points.length - 1].x || 1
  const x = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R)
  const yRaw = (v: number) => {
    const c = Math.min(hi, Math.max(lo, v))
    const f = (c - lo) / (hi - lo)
    return T + (invert ? f : 1 - f) * PH
  }
  const base = T + PH
  const line = points.map((p) => `${x(p.x).toFixed(1)},${yRaw(p.y).toFixed(1)}`)
  const ticksY = [0.15, 0.5, 0.85].map((f) => lo + (hi - lo) * f)
  const ticksX = [0, 0.25, 0.5, 0.75, 1].map((f) => x0 + (x1 - x0) * f)
  const cur = hover !== null ? points[nearest(points, hover)] : null

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const v = x0 + ((e.clientX - r.left - L) / (W - L - R)) * (x1 - x0)
    let k = 0
    let best = Infinity
    // ricerca binaria sull'asse X (crescente)
    let a = 0
    let b = points.length - 1
    while (a < b) {
      const m = (a + b) >> 1
      if (points[m].x < v) a = m + 1
      else b = m
    }
    for (const j of [a - 1, a]) {
      if (j < 0 || j >= points.length) continue
      const dist = Math.abs(points[j].x - v)
      if (dist < best) {
        best = dist
        k = j
      }
    }
    onHover(points[k].i)
  }

  return (
    <figure className="ac">
      <figcaption>
        <span>{label}</span>
        {cur && (
          <b>
            {format(cur.y)} <small>· {formatX(cur.x)}</small>
          </b>
        )}
      </figcaption>
      <div
        ref={ref}
        className="ac-box"
        onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          role="img"
          aria-label={label}
          className="chart-svg"
          onPointerMove={pick}
          onPointerDown={pick}
        >
          <defs>
            <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                style={{ stopColor: 'var(--c)', stopOpacity: 0.35 }}
              />
              <stop
                offset="1"
                style={{ stopColor: 'var(--c)', stopOpacity: 0.02 }}
              />
            </linearGradient>
          </defs>
          {ticksY.map((v) => (
            <g key={v}>
              <line
                x1={L}
                x2={W - R}
                y1={yRaw(v)}
                y2={yRaw(v)}
                stroke="var(--line)"
                strokeDasharray="3 4"
              />
              <text
                x={L - 6}
                y={yRaw(v) + 4}
                fontSize="11"
                fill="var(--muted)"
                textAnchor="end"
              >
                {format(v)}
              </text>
            </g>
          ))}
          {ticksX.map((v, k) => (
            <text
              key={k}
              x={x(v)}
              y={H - 6}
              fontSize="11"
              fill="var(--muted)"
              textAnchor={k === 0 ? 'start' : k === 4 ? 'end' : 'middle'}
            >
              {formatX(v)}
            </text>
          ))}
          <path
            fill={`url(#${uid}-g)`}
            d={`M${x(x0)},${base} L${line.join(' L')} L${x(x1)},${base} Z`}
          />
          <polyline
            fill="none"
            stroke="var(--c)"
            strokeWidth="1.8"
            strokeLinejoin="round"
            points={line.join(' ')}
          />
          {cur && (
            <g>
              <line
                x1={x(cur.x)}
                x2={x(cur.x)}
                y1={T}
                y2={base}
                stroke="var(--text)"
                strokeOpacity="0.5"
              />
              <circle
                cx={x(cur.x)}
                cy={yRaw(cur.y)}
                r="4"
                fill="var(--c)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>
    </figure>
  )
}
