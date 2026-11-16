import { useMemo, useState } from 'react'
import type { Exercise, LiveWorkout, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatDuration } from '../../lib/format'
import { liveSummary } from '../../lib/liveWorkout'
import Modal from '../planner/Modal'

interface Props {
  workout: LiveWorkout
  sessions: Session[]
  exercises: Exercise[]
  endedAtMs: number
  onSave: (notes: string) => Promise<void>
  onBack: () => void
}

/** Riepilogo finale: durata reale, serie, volume, record e note. */
export default function FinishDialog({
  workout,
  sessions,
  exercises,
  endedAtMs,
  onSave,
  onBack,
}: Props) {
  const { t, lang } = useI18n()
  const l = t.live
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const sum = useMemo(
    () => liveSummary(workout, sessions, endedAtMs),
    [workout, sessions, endedAtMs],
  )
  const num = (n: number, digits = 1) =>
    n.toLocaleString(lang, { maximumFractionDigits: digits })
  const nameOf = (id: string) =>
    exercises.find((e) => e.id === id)?.name ?? t.calendar.unknownExercise

  return (
    <Modal
      title={l.summaryTitle}
      closeLabel={l.back}
      onClose={onBack}
      backdropClose={false}
    >
      <dl className="lv-sum">
        <div>
          <dt>{l.duration}</dt>
          <dd>{formatDuration(sum.durationS)}</dd>
        </div>
        <div>
          <dt>{l.setsDone}</dt>
          <dd>{sum.setsDone}</dd>
        </div>
        <div>
          <dt>{l.volume}</dt>
          <dd>
            {num(sum.volumeKg, 0)} {l.kg}
          </dd>
        </div>
      </dl>

      <section className="lv-recs">
        <h4>{l.records}</h4>
        {sum.records.length === 0 ? (
          <p className="lv-muted">{l.noRecords}</p>
        ) : (
          <ul>
            {sum.records.map((r) => (
              <li key={r.exerciseId}>
                <b>{nameOf(r.exerciseId)}</b>
                {r.maxKg && (
                  <span>
                    {l.maxKg} {num(r.maxKg.value, 2)} {l.kg}{' '}
                    <small>
                      ({l.before} {num(r.maxKg.previous, 2)})
                    </small>
                  </span>
                )}
                {r.e1rm && (
                  <span>
                    {l.e1rm} {num(r.e1rm.value)} {l.kg}{' '}
                    <small>
                      ({l.before} {num(r.e1rm.previous)})
                    </small>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <label className="pl-fld">
        <span>{l.notes}</span>
        <textarea
          className="pl-inp"
          rows={3}
          placeholder={l.notesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="pl-actions">
        <button
          type="button"
          className="pl-btn acc"
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            try {
              await onSave(notes)
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? l.saving : l.save}
        </button>
        <button type="button" className="pl-btn" onClick={onBack}>
          {l.back}
        </button>
      </div>
    </Modal>
  )
}
