import type { EnduranceDiscipline } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  averageIntensity,
  hasElevation,
  parseMetrics,
  type MetricsDraft,
  type MetricsErrors,
} from '../../lib/enduranceActual'
import { formatIntensity, type DistUnit } from '../../lib/enduranceTemplate'

interface Props {
  discipline: EnduranceDiscipline
  draft: MetricsDraft
  errors: MetricsErrors
  /** Evidenzia gli errori solo dopo il primo "Salva". */
  submitted: boolean
  onChange: (patch: Partial<MetricsDraft>) => void
}

/** Campi dell'eseguito: tempo (obbligatorio), distanza, FC, dislivello; passo o velocità calcolati. */
export default function MetricsFields({
  discipline: d,
  draft: f,
  errors,
  submitted,
  onChange,
}: Props) {
  const { t } = useI18n()
  const e = t.endurance
  const bad = (k: keyof MetricsDraft) => submitted && !!errors[k]
  const { metrics } = parseMetrics(d, f)
  const avg = metrics ? averageIntensity(d, metrics) : null

  return (
    <div className="ea-grid">
      <label className="pl-fld">
        <span>{e.time} *</span>
        <input
          className="pl-inp"
          inputMode="numeric"
          placeholder={e.timeHint}
          value={f.time}
          aria-invalid={bad('time')}
          onChange={(ev) => onChange({ time: ev.target.value })}
        />
      </label>
      <label className="pl-fld">
        <span>{e.distance}</span>
        <span className="en-dist">
          <input
            className="pl-inp"
            inputMode="decimal"
            value={f.dist}
            aria-invalid={bad('dist')}
            onChange={(ev) => onChange({ dist: ev.target.value })}
          />
          <select
            className="pl-inp en-unit"
            value={f.unit}
            aria-label={t.planner.unitLabel}
            onChange={(ev) => onChange({ unit: ev.target.value as DistUnit })}
          >
            <option value="m">m</option>
            <option value="km">km</option>
          </select>
        </span>
      </label>
      <label className="pl-fld en-calc">
        <span>{d === 'bike' ? e.speed : e.pace}</span>
        <input
          className="pl-inp"
          readOnly
          tabIndex={-1}
          placeholder="—"
          value={avg !== null ? formatIntensity(avg, d) : ''}
        />
      </label>
      <label className="pl-fld">
        <span>
          {e.avgHr} ({e.bpm})
        </span>
        <input
          className="pl-inp"
          inputMode="numeric"
          value={f.avgHr}
          aria-invalid={bad('avgHr')}
          onChange={(ev) => onChange({ avgHr: ev.target.value })}
        />
      </label>
      <label className="pl-fld">
        <span>
          {e.maxHr} ({e.bpm})
        </span>
        <input
          className="pl-inp"
          inputMode="numeric"
          value={f.maxHr}
          aria-invalid={bad('maxHr')}
          onChange={(ev) => onChange({ maxHr: ev.target.value })}
        />
      </label>
      {hasElevation(d) && (
        <label className="pl-fld">
          <span>{e.elevation} (m)</span>
          <input
            className="pl-inp"
            inputMode="numeric"
            value={f.elev}
            aria-invalid={bad('elev')}
            onChange={(ev) => onChange({ elev: ev.target.value })}
          />
        </label>
      )}
    </div>
  )
}
