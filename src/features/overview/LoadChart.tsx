import type { Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatDuration } from '../../lib/format'
import { DISCIPLINES, loadByDiscipline } from '../../lib/weekStats'

const W = 380
const TOP = 24
const H = 170
const BASE = TOP + H

/** Ore pianificate vs effettive per disciplina (sedute della settimana). */
export default function LoadChart({ sessions }: { sessions: Session[] }) {
  const { t } = useI18n()
  const load = loadByDiscipline(sessions)
  const hours = DISCIPLINES.map((d) => ({
    d,
    p: load[d].plannedS / 3600,
    a: load[d].actualS / 3600,
  }))
  const max = Math.max(
    1,
    Math.ceil(Math.max(...hours.map((h) => Math.max(h.p, h.a)))),
  )
  const colW = (W - 44) / DISCIPLINES.length

  return (
    <svg
      viewBox={`0 0 ${W} ${BASE + 30}`}
      role="img"
      aria-label={t.overview.load}
      className="chart-svg"
    >
      {Array.from({ length: max + 1 }, (_, i) => {
        const y = BASE - (i / max) * H
        return (
          <g key={i}>
            <line x1="34" x2={W - 6} y1={y} y2={y} stroke="var(--line)" />
            <text
              x="26"
              y={y + 4}
              fontSize="11"
              fill="var(--muted)"
              textAnchor="end"
            >
              {i}h
            </text>
          </g>
        )
      })}
      {hours.map(({ d, p, a }, i) => {
        const x = 40 + i * colW + colW / 2
        const bw = Math.min(28, colW * 0.32)
        const hp = (p / max) * H
        const ha = (a / max) * H
        return (
          <g key={d}>
            <rect
              x={x - bw - 2}
              y={BASE - hp}
              width={bw}
              height={hp}
              rx="4"
              fill="var(--planned)"
            />
            <rect
              x={x + 2}
              y={BASE - ha}
              width={bw}
              height={ha}
              rx="4"
              fill={`var(--${d})`}
            />
            <text
              x={x - bw / 2 - 2}
              y={BASE - hp - 6}
              fontSize="10"
              fill="var(--muted)"
              textAnchor="middle"
            >
              {formatDuration(p * 3600)}
            </text>
            <text
              x={x + bw / 2 + 2}
              y={BASE - ha - 6}
              fontSize="10"
              fill="var(--text)"
              textAnchor="middle"
            >
              {formatDuration(a * 3600)}
            </text>
            <text
              x={x}
              y={BASE + 20}
              fontSize="13"
              fontWeight="600"
              fill="var(--text)"
              textAnchor="middle"
            >
              {t.discipline[d]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
