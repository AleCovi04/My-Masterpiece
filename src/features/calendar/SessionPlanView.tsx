import type {
  EnduranceSession,
  EnduranceStep,
  Exercise,
  Session,
  StrengthSession,
  TemplateSet,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  formatClock,
  formatDist,
  formatIntensity,
  templateTotals,
} from '../../lib/enduranceTemplate'
import { formatMmSs } from '../../lib/exercises'
import { formatDuration } from '../../lib/format'
import { blocks, supersetLabels } from '../../lib/templates'

/** Il piano di una seduta, in sola lettura. */
export default function SessionPlanView({
  session,
  exercises,
}: {
  session: Session
  exercises: Exercise[]
}) {
  return session.discipline === 'strength' ? (
    <StrengthView session={session} exercises={exercises} />
  ) : (
    <EnduranceView session={session} />
  )
}

// ---------- forza: esercizi, serie e superserie ----------

/** Serie consecutive uguali diventano una riga sola ("3 × 10 reps"). */
function groupSets(sets: TemplateSet[]): { n: number; set: TemplateSet }[] {
  const out: { n: number; set: TemplateSet }[] = []
  for (const set of sets) {
    const last = out[out.length - 1]
    if (
      last &&
      last.set.reps === set.reps &&
      last.set.kg === set.kg &&
      last.set.rir === set.rir
    ) {
      last.n += 1
    } else {
      out.push({ n: 1, set })
    }
  }
  return out
}

function StrengthView({
  session,
  exercises,
}: {
  session: StrengthSession
  exercises: Exercise[]
}) {
  const { t } = useI18n()
  const c = t.calendar
  const entries = session.plan.entries
  if (entries.length === 0) return <div className="ph sd-ph">{c.planEmpty}</div>

  const names = new Map(exercises.map((e) => [e.id, e.name]))
  const labels = supersetLabels(entries)

  return (
    <div className="sd-plan">
      {blocks(entries).map((b) => {
        const ssId = entries[b.start].supersetId
        const label = ssId ? labels.get(ssId) : undefined
        return (
          <div
            key={b.start}
            className={`tp-block${label ? ' ss' : ''}`}
            data-ss={label ? (label.charCodeAt(0) - 65) % 4 : undefined}
          >
            {label && (
              <div className="tp-sslabel">
                {t.planner.superset} {label}
              </div>
            )}
            {entries.slice(b.start, b.end).map((en, k) => (
              <div className="sd-ex" key={b.start + k}>
                <b>{names.get(en.exerciseId) ?? c.unknownExercise}</b>
                <ul>
                  {groupSets(en.sets).map(({ n, set }, i) => (
                    <li key={i}>
                      <span>
                        {n} × {set.reps} {t.planner.reps.toLowerCase()}
                      </span>
                      <span>{set.kg} kg</span>
                      <span>RIR {set.rir}</span>
                    </li>
                  ))}
                </ul>
                {b.start + k === b.end - 1 && (
                  <small>
                    {label ? c.restAfterRound : c.rest}{' '}
                    {formatMmSs(en.restSeconds)}
                  </small>
                )}
                {en.notes && <p>{en.notes}</p>}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ---------- endurance: passi, blocchi e totali ----------

function EnduranceView({ session }: { session: EnduranceSession }) {
  const { t } = useI18n()
  const c = t.calendar
  const p = t.planner
  const d = session.discipline
  const plan = session.plan
  const totals = templateTotals({ discipline: d, ...plan })

  const empty =
    plan.mode === 'simple'
      ? totals.distanceM === null && totals.durationS === null
      : (plan.items ?? []).length === 0
  if (empty) return <div className="ph sd-ph">{c.planEmpty}</div>

  const amount = (s: Pick<EnduranceStep, 'distanceM' | 'durationS'>) =>
    s.distanceM !== undefined
      ? formatDist(s.distanceM, d)
      : s.durationS !== undefined
        ? formatClock(s.durationS)
        : '—'

  const step = (s: EnduranceStep) => (
    <div className="en-step sd-step" data-type={s.type} key={s.id}>
      <div className="sd-step-h">
        <b>{p.stepType[s.type]}</b>
        <span>
          {amount(s)}
          {s.intensity !== undefined && ` @ ${formatIntensity(s.intensity, d)}`}
        </span>
      </div>
      {s.notes && <p>{s.notes}</p>}
    </div>
  )

  const partial = !totals.distanceComplete || !totals.durationComplete

  return (
    <div className="sd-plan">
      <div className="sd-totals">
        <div>
          <small>{p.totalDistance}</small>
          <b>
            {totals.distanceM === null
              ? '—'
              : `${totals.distanceComplete ? '' : '≥ '}${formatDist(totals.distanceM, d)}`}
          </b>
        </div>
        <div>
          <small>{p.totalTime}</small>
          <b>
            {totals.durationS === null
              ? '—'
              : `${totals.durationComplete ? '' : '≥ '}${formatDuration(totals.durationS)}`}
          </b>
        </div>
        {partial && <small className="sd-partial">{p.partialNote}</small>}
      </div>

      {plan.mode === 'simple' ? (
        <dl className="sd-meta">
          <div>
            <dt>{c.goal}</dt>
            <dd>
              {plan.simple?.goal === 'time' ? p.goalTime : p.goalDistance}
              {' · '}
              {amount(
                plan.simple?.goal === 'time'
                  ? { durationS: plan.simple.durationS }
                  : { distanceM: plan.simple?.distanceM },
              )}
            </dd>
          </div>
          <div>
            <dt>{c.intensity}</dt>
            <dd>
              {plan.simple?.intensity !== undefined
                ? formatIntensity(plan.simple.intensity, d)
                : '—'}
            </dd>
          </div>
        </dl>
      ) : (
        (plan.items ?? []).map((it) =>
          it.kind === 'step' ? (
            step(it)
          ) : (
            <div className="en-repeat sd-repeat" key={it.id}>
              <b>
                {p.repeatWord} {it.times} {p.timesWord}
              </b>
              {it.steps.map(step)}
            </div>
          ),
        )
      )}
    </div>
  )
}
