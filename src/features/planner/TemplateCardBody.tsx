import { DisciplineIcon } from '../../components/ui/Icons'
import {
  MUSCLES,
  type Exercise,
  type MuscleId,
  type WorkoutTemplate,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  formatDist,
  formatIntensity,
  structureSummary,
  templateDurationSec,
  templateTotals,
} from '../../lib/enduranceTemplate'
import { formatDuration } from '../../lib/format'
import { topMuscles } from '../../lib/templates'

interface Props {
  template: WorkoutTemplate
  exercises: Exercise[]
}

/** Contenuto della card di un allenamento salvato (Planner e selettore del Calendario). */
export default function TemplateCardBody({ template: w, exercises }: Props) {
  const { t, lang } = useI18n()
  const p = t.planner
  const label = (id: MuscleId) => MUSCLES.find((m) => m.id === id)?.[lang] ?? id

  const muscles = w.discipline === 'strength' ? topMuscles(w, exercises) : []
  const seconds = templateDurationSec(w)
  let meta: string
  let summary = ''
  if (w.discipline === 'strength') {
    meta = `${w.entries.length} ${p.exercisesCount}`
    if (seconds) meta += ` · ${formatDuration(seconds)}`
  } else {
    const totals = templateTotals(w)
    meta = [
      totals.distanceM !== null &&
        `${totals.distanceComplete ? '' : '≥ '}${formatDist(totals.distanceM, w.discipline)}`,
      seconds &&
        `${!w.estimatedDurationSec && !totals.durationComplete ? '≥ ' : ''}${formatDuration(seconds)}`,
    ]
      .filter(Boolean)
      .join(' · ')
    if (w.mode === 'structured') {
      summary = structureSummary(w.items ?? [], w.discipline, {
        warmup: p.stepShort.warmup,
        recovery: p.stepShort.recovery,
        cooldown: p.stepShort.cooldown,
      })
    } else if (w.simple?.intensity !== undefined) {
      summary = `@ ${formatIntensity(w.simple.intensity, w.discipline)}`
    }
  }

  return (
    <>
      <span className="wk-head">
        <span className="wk-ic">
          <DisciplineIcon discipline={w.discipline} />
        </span>
        <b className="pl-item-name">
          {w.name}
          {w.archived && <span className="pl-tag">{p.archivedTag}</span>}
        </b>
      </span>
      {meta && <span className="wk-meta">{meta}</span>}
      {summary && <span className="wk-sum">{summary}</span>}
      {muscles.length > 0 && (
        <span className="wk-chips">
          {muscles.map((m) => (
            <span key={m} className="wk-chip">
              {label(m)}
            </span>
          ))}
        </span>
      )}
    </>
  )
}
