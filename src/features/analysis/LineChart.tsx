import { niceMax } from '../../lib/analysis'
import { useChartWidth } from './useChartWidth'

export interface LineSeries {
  key: string
  label: string
  /** Colore CSS, da una variabile del tema. */
  color: string
  values: number[]
  dashed?: boolean
}

interface Props {
  label: string
  ticks: string[]
  series: LineSeries[]
  format: (v: number) => string
}

const H = 220
const L = 44
const R = 10
const T = 12
const B = 28
const PH = H - T - B

/** Linee nel tempo (un punto per giorno o per settimana). */
export default function LineChart({ label, ticks, series, format }: Props) {
  const { ref, width: W } = useChartWidth()
  const n = ticks.length
  const top = Math.max(0, ...series.flatMap((s) => s.values))
  const { max, step } = niceMax(top)
  const y = (v: number) => T + PH - (v / max) * PH
  const x = (i: number) =>
    n <= 1 ? (L + W - R) / 2 : L + ((W - L - R) * i) / (n - 1)
  const every = Math.max(1, Math.ceil(n / Math.max(1, (W - L - R) / 48)))
  const lines = Math.round(max / step)

  return (
    <div ref={ref} className="ana-chart">
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
        {ticks.map((tick, i) =>
          i % every === 0 ? (
            <text
              key={i}
              x={x(i)}
              y={H - 9}
              fontSize="11"
              fill="var(--muted)"
              textAnchor="middle"
            >
              {tick}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dashed ? '6 4' : undefined}
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          >
            <title>{s.label}</title>
          </polyline>
        ))}
      </svg>
    </div>
  )
}
