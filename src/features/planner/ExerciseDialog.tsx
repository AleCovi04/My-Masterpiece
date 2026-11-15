import { useState, type FormEvent } from 'react'
import {
  DEFAULT_REST_SECONDS,
  MUSCLES,
  type Exercise,
  type MuscleId,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  formatMmSs,
  isNameTaken,
  parseMmSs,
  type ExerciseUsage,
} from '../../lib/exercises'
import Modal from './Modal'

interface Props {
  /** `null` = nuovo esercizio. */
  exercise: Exercise | null
  all: Exercise[]
  usage: ExerciseUsage
  onSave: (e: Exercise) => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onClose: () => void
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `ex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const parsePercent = (raw: string): number | null =>
  /^\d{1,3}$/.test(raw.trim()) && Number(raw) >= 1 && Number(raw) <= 100
    ? Number(raw)
    : null

export default function ExerciseDialog({
  exercise,
  all,
  usage,
  onSave,
  onArchive,
  onDelete,
  onClose,
}: Props) {
  const { t, lang } = useI18n()
  const p = t.planner
  const [name, setName] = useState(exercise?.name ?? '')
  // muscolo → percentuale grezza (stringa), presente solo se selezionato
  const [muscles, setMuscles] = useState<Partial<Record<MuscleId, string>>>(
    () =>
      Object.fromEntries(
        (exercise?.muscles ?? []).map((m) => [m.muscle, String(m.percent)]),
      ),
  )
  const [rest, setRest] = useState(
    formatMmSs(exercise?.defaultRestSeconds ?? DEFAULT_REST_SECONDS),
  )
  const [notes, setNotes] = useState(exercise?.notes ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const selected = MUSCLES.filter((m) => muscles[m.id] !== undefined)
  const nameError = !name.trim()
    ? p.nameRequired
    : isNameTaken(all, name, exercise?.id)
      ? p.nameTaken
      : null
  const musclesError = selected.length === 0 ? p.musclesRequired : null
  const restError =
    rest.trim() !== '' && parseMmSs(rest) === null ? p.restInvalid : null
  const percentBad = (id: MuscleId) =>
    muscles[id] !== undefined && parsePercent(muscles[id]) === null
  const anyPercentBad = selected.some((m) => percentBad(m.id))
  const valid = !nameError && !musclesError && !restError && !anyPercentBad

  const toggle = (id: MuscleId) =>
    setMuscles((cur) => {
      const next = { ...cur }
      if (next[id] !== undefined) delete next[id]
      else next[id] = Object.keys(cur).length === 0 ? '100' : '50'
      return next
    })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!valid) return
    const now = new Date().toISOString()
    const trimmedNotes = notes.trim()
    onSave({
      id: exercise?.id ?? newId(),
      name: name.trim().replace(/\s+/g, ' '),
      muscles: selected.map((m) => ({
        muscle: m.id,
        percent: parsePercent(muscles[m.id] ?? '') ?? 1,
      })),
      defaultRestSeconds: parseMmSs(rest) ?? DEFAULT_REST_SECONDS,
      ...(trimmedNotes && { notes: trimmedNotes }),
      archived: exercise?.archived ?? false,
      createdAt: exercise?.createdAt ?? now,
      updatedAt: now,
    })
  }

  const inUse = usage.templates > 0 || usage.sessions > 0
  const usedIn = [
    usage.templates > 0 && `${usage.templates} ${p.inUseTemplates}`,
    usage.sessions > 0 && `${usage.sessions} ${p.inUseSessions}`,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Modal
      title={exercise ? p.editExercise : p.newExercise}
      closeLabel={p.close}
      onClose={onClose}
    >
      <form className="pl-form" onSubmit={submit} noValidate>
        <label className="pl-fld">
          <span>{p.name} *</span>
          <input
            className="pl-inp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={submitted && !!nameError}
            autoComplete="off"
          />
          {submitted && nameError && <em className="pl-err">{nameError}</em>}
        </label>

        <fieldset className="pl-fld">
          <legend>{p.muscles} *</legend>
          <small>{p.musclesHint}</small>
          <div className="pl-mlist">
            {MUSCLES.map((m) => {
              const raw = muscles[m.id]
              const on = raw !== undefined
              return (
                <div className={`pl-mrow${on ? ' on' : ''}`} key={m.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(m.id)}
                    />
                    {m[lang]}
                  </label>
                  {on && (
                    <span className="pl-pct">
                      <input
                        className="pl-inp"
                        inputMode="numeric"
                        value={raw}
                        aria-label={`${p.percent} – ${m[lang]}`}
                        aria-invalid={submitted && percentBad(m.id)}
                        onChange={(e) =>
                          setMuscles((cur) => ({
                            ...cur,
                            [m.id]: e.target.value,
                          }))
                        }
                      />
                      %
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {submitted && musclesError && (
            <em className="pl-err">{musclesError}</em>
          )}
          {submitted && anyPercentBad && (
            <em className="pl-err">{p.percentInvalid}</em>
          )}
        </fieldset>

        <label className="pl-fld">
          <span>{p.restLabel}</span>
          <input
            className="pl-inp pl-short"
            value={rest}
            onChange={(e) => setRest(e.target.value)}
            placeholder={formatMmSs(DEFAULT_REST_SECONDS)}
            inputMode="numeric"
            aria-invalid={submitted && !!restError}
          />
          {submitted && restError && <em className="pl-err">{restError}</em>}
        </label>

        <label className="pl-fld">
          <span>{p.notes}</span>
          <textarea
            className="pl-inp"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="pl-actions">
          <button type="submit" className="pl-btn acc">
            {p.save}
          </button>
          <button type="button" className="pl-btn" onClick={onClose}>
            {p.cancel}
          </button>
        </div>

        {exercise && (
          <div className="pl-danger">
            <button
              type="button"
              className="pl-btn"
              onClick={() => onArchive(!exercise.archived)}
            >
              {exercise.archived ? p.restore : p.archive}
            </button>
            {inUse ? (
              <small>
                {p.inUse} {usedIn}. {p.inUseHint}
              </small>
            ) : confirmingDelete ? (
              <span className="pl-confirm">
                <small>{p.confirmDelete}</small>
                <button
                  type="button"
                  className="pl-btn warn"
                  onClick={onDelete}
                >
                  {p.confirmYes}
                </button>
                <button
                  type="button"
                  className="pl-btn"
                  onClick={() => setConfirmingDelete(false)}
                >
                  {p.cancel}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="pl-btn warn"
                onClick={() => setConfirmingDelete(true)}
              >
                {p.delete}
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
