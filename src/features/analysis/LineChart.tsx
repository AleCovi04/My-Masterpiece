import { useId, useState, type PointerEvent } from 'react'
import { axisScale } from '../../lib/analysis'
import ChartTip from './ChartTip'
import { chartHeight, useChartWidth } from './useChartWidth'

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
  /** Descrizione di ogni punto per il riquadro (di default l'etichetta dell'asse). */
  titles?: string[]
  series: LineSeries[]
  format: (v: number) => string
  /** Niente numeri (asse Y e riquadro): conta solo la forma della curva. */
  hideValues?: boolean
}

const AXIS_LEFT = 46
const R = 12
const T = 14
const B = 30

/** Linee nel tempo con area sfumata; tocca o passa sopra per leggere i valori. */
export default function LineChart({
  label,
  ticks,
  titles = ticks,
  series,
  format,
  hideValues = false,
}: Props) {
  const { ref, width: W } = useChartWidth()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [sel, setSel] = useState<number | null>(null)
  // senza numeri sull'asse non serve il margine a sinistra
  const L = hideValues ? R : AXIS_LEFT
  const H = chartHeight(W)
  const PH = H - T - B
  const n = ticks.length
  const top = Math.max(0, ...series.flatMap((s) => s.values))
  const { max, lines } = axisScale(top)
  const y = (v: number) => T + PH - (v / max) * PH
  const x = (i: number) =>
    n <= 1 ? (L + W - R) / 2 : L + ((W - L - R) * i) / (n - 1)
  const every = Math.max(1, Math.ceil(n / Math.max(1, (W - L - R) / 52)))
  const current = sel !== null && sel < n ? sel : null

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    if (n === 0) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const i = n <= 1 ? 0 : Math.round(((px - L) / (W - L - R)) * (n - 1))
    setSel(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div
      ref={ref}
      className="ana-chart"
      onPointerLeave={(e) => e.pointerType === 'mouse' && setSel(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={label}
        className="chart-svg"
        onPointerMove={(e) => e.pointerType === 'mouse' && pick(e)}
        onPointerDown={pick}
      >
        <defs>
          {series.map((s) => (
            <linearGradient
              key={s.key}
              id={`${uid}-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0"
                style={{ stopColor: s.color, stopOpacity: 0.28 }}
              />
              <stop offset="1" style={{ stopColor: s.color, stopOpacity: 0 }} />
            </linearGradient>
          ))}
        </defs>
        {lines.map((v, k) => (
          <g key={v}>
            <line
              x1={L}
              x2={W - R}
              y1={y(v)}
              y2={y(v)}
              stroke={k === 0 ? 'var(--muted)' : 'var(--line)'}
              strokeOpacity={k === 0 ? 0.5 : 1}
              strokeDasharray={k === 0 ? undefined : '3 4'}
            />
            {!hideValues && (
              <text
                x={L - 8}
                y={y(v) + 4}
                fontSize="11"
                fill="var(--muted)"
                textAnchor="end"
              >
                {format(v)}
              </text>
            )}
          </g>
        ))}
        {ticks.map((tick, i) =>
          // la prima etichetta è allineata a sinistra: la successiva non le si sovrappone
          i % every === 0 && (i === 0 || x(i) > L + 64) ? (
            <text
              key={i}
              x={x(i)}
              y={H - 10}
              fontSize="11"
              fill="var(--muted)"
              // le etichette ai bordi non escono dal grafico
              textAnchor={
                x(i) > W - R - 24 ? 'end' : x(i) < L + 24 ? 'start' : 'middle'
              }
            >
              {tick}
            </text>
          ) : null,
        )}
        {n > 1 &&
          series
            .filter((s) => !s.dashed)
            .map((s) => (
              <path
                key={`area-${s.key}`}
                fill={`url(#${uid}-${s.key})`}
                d={`M${x(0)},${y(0)} ${s.values
                  .map((v, i) => `L${x(i)},${y(v)}`)
                  .join(' ')} L${x(n - 1)},${y(0)} Z`}
              />
            ))}
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
          />
        ))}
        {current === null &&
          n > 0 &&
          series.map((s) => (
            <circle
              key={`last-${s.key}`}
              cx={x(n - 1)}
              cy={y(s.values[n - 1] ?? 0)}
              r="4"
              fill={s.color}
              stroke="var(--surface)"
              strokeWidth="2"
            />
          ))}
        {current !== null && (
          <g>
            <line
              x1={x(current)}
              x2={x(current)}
              y1={T}
              y2={T + PH}
              stroke="var(--muted)"
              strokeOpacity="0.6"
              strokeDasharray="3 3"
            />
            {series.map((s) => (
              <circle
                key={s.key}
                cx={x(current)}
                cy={y(s.values[current] ?? 0)}
                r="5"
                fill={s.color}
                stroke="var(--surface)"
                strokeWidth="2"
              />
            ))}
          </g>
        )}
      </svg>
      {current !== null && (
        <ChartTip
          x={x(current)}
          width={W}
          top={T}
          title={titles[current]}
          rows={series.map((s) => ({
            key: s.key,
            label: s.label,
            color: s.color,
            value: hideValues ? '' : format(s.values[current] ?? 0),
          }))}
        />
      )}
    </div>
  )
}
