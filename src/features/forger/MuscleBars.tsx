import { MUSCLES, type MuscleId } from '../../data/types'
import { useI18n } from '../../i18n/context'

interface Row {
  muscle: MuscleId
  percent: number
}

interface Props {
  /** Già ordinati per % decrescente. */
  muscles: Row[]
  /** Muscoli evidenziati (filtro attivo). */
  highlight?: MuscleId[]
}

/** Righe nome · barra 0–100% · numero, allineate tra loro (solo span: sta anche dentro un button). */
export default function MuscleBars({ muscles, highlight = [] }: Props) {
  const { lang } = useI18n()
  return (
    <span className="mb">
      {muscles.map((m) => {
        const name = MUSCLES.find((g) => g.id === m.muscle)?.[lang] ?? m.muscle
        return (
          <span
            key={m.muscle}
            className={`mb-row${highlight.includes(m.muscle) ? ' hit' : ''}`}
          >
            <span className="mb-name">{name}</span>
            <span className="mb-track" aria-hidden="true">
              <i
                style={{ width: `${Math.min(100, Math.max(0, m.percent))}%` }}
              />
            </span>
            <span className="mb-pct">{m.percent}%</span>
          </span>
        )
      })}
    </span>
  )
}
