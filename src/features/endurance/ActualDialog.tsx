import { useMemo, useState, type FormEvent } from 'react'
import { DisciplineIcon } from '../../components/ui/Icons'
import type {
  BrickActual,
  BrickLegActual,
  BrickSession,
  EnduranceActual,
  EnduranceDiscipline,
  EnduranceSession,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  brickActual,
  enduranceActual,
  metricsDraft,
  parseMetrics,
  type MetricsDraft,
} from '../../lib/enduranceActual'
import { formatClock, parseClock } from '../../lib/enduranceTemplate'
import RpeScale from '../../components/ui/RpeScale'
import Modal from '../planner/Modal'
import MetricsFields from './MetricsFields'
import './endurance.css'

interface LegForm {
  legId: string
  discipline: EnduranceDiscipline
  draft: MetricsDraft
  transition: string
}

interface Props {
  session: EnduranceSession | BrickSession
  onSave: (actual: EnduranceActual | BrickActual) => void
  onClose: () => void
}

const transitionOk = (raw: string) =>
  raw.trim() === '' || parseClock(raw) !== null

/** Inserimento manuale dell'eseguito: seduta singola o brick per frazione. */
export default function ActualDialog({ session: s, onSave, onClose }: Props) {
  const { t } = useI18n()
  const e = t.endurance
  const a = s.actual

  // seduta singola
  const [draft, setDraft] = useState<MetricsDraft>(() =>
    metricsDraft(
      s.discipline === 'brick' ? 'run' : s.discipline,
      s.discipline !== 'brick' ? s.actual : undefined,
    ),
  )
  // brick: una sezione per frazione del piano, con i dati già salvati per la stessa frazione
  const [legs, setLegs] = useState<LegForm[]>(() =>
    s.discipline === 'brick'
      ? s.plan.legs.map((pl) => {
          const done = s.actual?.legs.find((x) => x.legId === pl.id)
          return {
            legId: pl.id,
            discipline: pl.discipline,
            draft: metricsDraft(pl.discipline, done),
            transition: done?.transitionBeforeS
              ? formatClock(done.transitionBeforeS)
              : '',
          }
        })
      : [],
  )
  const [rpe, setRpe] = useState<number | null>(a?.rpe ?? null)
  const [notes, setNotes] = useState(a?.notes ?? '')
  const [submitted, setSubmitted] = useState(false)

  const single = useMemo(
    () => (s.discipline === 'brick' ? null : parseMetrics(s.discipline, draft)),
    [s.discipline, draft],
  )
  const parsedLegs = useMemo(
    () => legs.map((l) => parseMetrics(l.discipline, l.draft)),
    [legs],
  )

  const isBrick = s.discipline === 'brick'
  const noLegs = isBrick && legs.length === 0
  const valid = isBrick
    ? !noLegs &&
      parsedLegs.every((p) => p.metrics) &&
      legs.every((l, i) => i === 0 || transitionOk(l.transition))
    : !!single?.metrics
  const complete = valid && rpe !== null

  const patchLeg = (i: number, patch: Partial<LegForm>) =>
    setLegs((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)))

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    setSubmitted(true)
    if (!complete) return
    if (s.discipline === 'brick') {
      const built: BrickLegActual[] = legs.map((l, i) => {
        const tr = i > 0 ? parseClock(l.transition) : null
        return {
          legId: l.legId,
          discipline: l.discipline,
          ...parsedLegs[i].metrics!,
          ...(tr ? { transitionBeforeS: tr } : {}),
        }
      })
      onSave(brickActual(built, rpe, notes))
    } else {
      onSave(enduranceActual(s.discipline, single!.metrics!, rpe, notes))
    }
  }

  return (
    <Modal
      title={a ? e.editTitle : e.dialogTitle}
      closeLabel={e.close}
      onClose={onClose}
      wide
      backdropClose={false}
    >
      <form
        className="pl-form"
        onSubmit={submit}
        noValidate
        data-discipline={s.discipline}
      >
        <div className="en-disc">
          <span className="wk-ic">
            <DisciplineIcon discipline={s.discipline} />
          </span>
          <b>{s.name ?? t.discipline[s.discipline]}</b>
        </div>

        {s.discipline !== 'brick' ? (
          <MetricsFields
            discipline={s.discipline}
            draft={draft}
            errors={single?.errors ?? {}}
            submitted={submitted}
            onChange={(patch) => setDraft((f) => ({ ...f, ...patch }))}
          />
        ) : noLegs ? (
          <div className="ph">{e.noLegs}</div>
        ) : (
          <ol className="ea-legs">
            {legs.map((l, i) => (
              <li key={l.legId} data-discipline={l.discipline}>
                {i > 0 && (
                  <label className="bk-trans">
                    <span>{e.transition}</span>
                    <input
                      className="pl-inp pl-short"
                      inputMode="numeric"
                      placeholder="mm:ss"
                      value={l.transition}
                      aria-invalid={submitted && !transitionOk(l.transition)}
                      onChange={(ev) =>
                        patchLeg(i, { transition: ev.target.value })
                      }
                    />
                  </label>
                )}
                <section className="ea-leg">
                  <h4>
                    <span className="wk-ic">
                      <DisciplineIcon discipline={l.discipline} />
                    </span>
                    {e.leg} {i + 1} · {t.discipline[l.discipline]}
                  </h4>
                  <MetricsFields
                    discipline={l.discipline}
                    draft={l.draft}
                    errors={parsedLegs[i].errors}
                    submitted={submitted}
                    onChange={(patch) =>
                      patchLeg(i, { draft: { ...l.draft, ...patch } })
                    }
                  />
                </section>
              </li>
            ))}
          </ol>
        )}

        <RpeScale value={rpe} onChange={setRpe} showError={submitted} />

        <label className="pl-fld">
          <span>{e.notes}</span>
          <textarea
            className="pl-inp"
            rows={3}
            placeholder={e.notesPlaceholder}
            value={notes}
            onChange={(ev) => setNotes(ev.target.value)}
          />
        </label>

        {submitted && !valid && !noLegs && (
          <em className="pl-err">{e.checkFields}</em>
        )}

        <div className="pl-actions">
          <button type="submit" className="pl-btn acc" disabled={noLegs}>
            {e.save}
          </button>
          <button type="button" className="pl-btn" onClick={onClose}>
            {e.cancel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
