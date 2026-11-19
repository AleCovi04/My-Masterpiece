import { useId, useState, type PointerEvent } from 'react'
import { axisScale } from '../../lib/analysis'
import ChartTip, { type TipRow } from './ChartTip'
import { chartHeight, useChartWidth } from '../../hooks/useChartWidth'

interface BarStack {
  key: string
  /** Nome della serie, per il riquadro di dettaglio. */
  label: string
  /** Colore CSS, da una variabile del tema. */
  color: string
  values: number[]
}

interface Props {
  label: string
  /** Etichette dell'asse X, una per intervallo. */
  ticks: string[]
  /** Descrizione dell'intervallo per il riquadro di dettaglio. */
  titles: string[]
  stacks: BarStack[]
  /** Totale pianificato per intervallo: un puntino per colonna, uniti dal tratteggio. */
  planned?: number[]
  plannedLabel?: string
  /** Etichetta del totale (con più serie impilate). */
  totalLabel?: string
  /** Testo dei valori sull'asse Y. */
  format: (v: number) => string
  /** Testo dei valori nel riquadro (di default come l'asse). */
  formatTip?: (v: number) => string
}

const L = 46
const R = 10
const T = 14
const B = 30

/** Barre impilate per intervallo, con il pianificato a puntini; tocca una colonna per il dettaglio. */
export default function BarChart({
  label,
  ticks,
  titles,
  stacks,
  planned,
  plannedLabel,
  totalLabel,
  format,
  formatTip = format,
}: Props) {
  const { ref: box, width: W } = useChartWidth()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [sel, setSel] = useState<number | null>(null)
  const H = chartHeight(W)
  const PH = H - T - B
  const n = ticks.length
  const totals = ticks.map((_, i) =>
    stacks.reduce((a, s) => a + (s.values[i] ?? 0), 0),
  )
  const top = Math.max(0, ...totals, ...(planned ?? []))
  const { max, lines } = axisScale(top)
  const y = (v: number) => T + PH - (v / max) * PH
  const slot = (W - L - R) / Math.max(1, n)
  const bw = Math.max(1, Math.min(34, slot * 0.64))
  const radius = Math.min(6, bw / 2)
  // al più un'etichetta ogni ~44 px
  const every = Math.max(1, Math.ceil(44 / slot))
  const cx = (i: number) => L + slot * (i + 0.5)
  const dot = slot < 6 ? 1.6 : slot < 14 ? 2.6 : 3.6
  const current = sel !== null && sel < n ? sel : null

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - r.left - L) / slot)
    setSel(i >= 0 && i < n ? i : null)
  }

  const tipRows = (i: number): TipRow[] => [
    // con più serie si nascondono quelle a zero
    ...stacks
      .filter((s) => stacks.length === 1 || (s.values[i] ?? 0) > 0)
      .map((s) => ({
        key: s.key,
        color: s.color,
        label: s.label,
        value: formatTip(s.values[i] ?? 0),
      })),
    ...(stacks.length > 1 && totalLabel
      ? [
          {
            key: 'tot',
            label: totalLabel,
            value: formatTip(totals[i]),
            strong: true,
          },
        ]
      : []),
    ...(planned && plannedLabel
      ? [
          {
            key: 'plan',
            label: plannedLabel,
            value: formatTip(planned[i] ?? 0),
            planned: true,
          },
        ]
      : []),
  ]

  return (
    <div
      ref={box}
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
            <text
              x={L - 8}
              y={y(v) + 4}
              fontSize="11"
              fill="var(--muted)"
              textAnchor="end"
            >
              {format(v)}
            </text>
          </g>
        ))}

        {current !== null && (
          <rect
            x={cx(current) - slot / 2}
            y={T}
            width={slot}
            height={PH}
            rx={Math.min(8, slot / 4)}
            fill="var(--line)"
            opacity="0.6"
          />
        )}

        <defs>
          {totals.map((tot, i) =>
            tot > 0 ? (
              <clipPath key={i} id={`${uid}-b${i}`}>
                <rect
                  x={cx(i) - bw / 2}
                  y={y(tot)}
                  width={bw}
                  height={y(0) - y(tot) + radius}
                  rx={radius}
                />
              </clipPath>
            ) : null,
          )}
        </defs>

        {totals.map((tot, i) => {
          if (tot <= 0) return null
          let acc = 0
          return (
            <g
              key={i}
              clipPath={`url(#${uid}-b${i})`}
              opacity={current === null || current === i ? 1 : 0.45}
            >
              {stacks.map((s) => {
                const v = s.values[i] ?? 0
                if (v <= 0) return null
                const y0 = y(acc)
                acc += v
                const y1 = y(acc)
                return (
                  <rect
                    key={s.key}
                    x={cx(i) - bw / 2}
                    y={y1}
                    width={bw}
                    height={Math.max(0, y0 - y1)}
                    fill={s.color}
                  />
                )
              })}
            </g>
          )
        })}

        {planned && planned.some((p) => p > 0) && (
          <g className="ana-planned">
            {n > 1 && (
              <polyline
                fill="none"
                stroke="var(--text)"
                strokeOpacity="0.55"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeLinejoin="round"
                points={planned.map((p, i) => `${cx(i)},${y(p)}`).join(' ')}
              />
            )}
            {planned.map((p, i) => (
              <circle
                key={i}
                cx={cx(i)}
                cy={y(p)}
                r={current === i ? dot + 1.5 : dot}
                fill="var(--text)"
                stroke="var(--surface)"
                strokeWidth="1.5"
              />
            ))}
          </g>
        )}

        {ticks.map((tick, i) =>
          i % every === 0 ? (
            <text
              key={i}
              x={cx(i)}
              y={H - 10}
              fontSize="11"
              fill={current === i ? 'var(--text)' : 'var(--muted)'}
              fontWeight={current === i ? 700 : 400}
              textAnchor="middle"
            >
              {tick}
            </text>
          ) : null,
        )}
      </svg>

      {current !== null && (
        <ChartTip
          x={cx(current)}
          width={W}
          top={T}
          title={titles[current]}
          rows={tipRows(current)}
        />
      )}
    </div>
  )
}

/** Chiave della legenda per il pianificato: puntino e tratteggio. */
export function PlannedKey() {
  return (
    <svg className="ana-pkey" viewBox="0 0 26 10" aria-hidden="true">
      <line
        x1="1"
        x2="25"
        y1="5"
        y2="5"
        stroke="var(--text)"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <circle cx="13" cy="5" r="3.5" fill="var(--text)" />
    </svg>
  )
}
