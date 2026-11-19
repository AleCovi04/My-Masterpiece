import { useState, type CSSProperties, type FormEvent } from 'react'
import { BodyMap } from '../../components/body'
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
import { newId } from '../../lib/ids'
import Modal from '../../components/ui/Modal'

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

  // Righe ordinate per % (le % non valide in coda, ordine stabile).
  const selected = MUSCLES.filter((m) => muscles[m.id] !== undefined).sort(
    (a, b) =>
      (parsePercent(muscles[b.id] ?? '') ?? 0) -
      (parsePercent(muscles[a.id] ?? '') ?? 0),
  )
  const selectedIds = selected.map((m) => m.id)
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

  // Dalla mappa: i nuovi muscoli partono da 100 (il primo) o 50; i tolti spariscono.
  const setSelectedIds = (ids: MuscleId[]) =>
    setMuscles((cur) => {
      const next: Partial<Record<MuscleId, string>> = {}
      let first = Object.keys(cur).length === 0
      for (const id of ids) {
        if (cur[id] !== undefined) next[id] = cur[id]
        else {
          next[id] = first ? '100' : '50'
          first = false
        }
      }
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
      wide
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
          <BodyMap
            mode="select"
            multiple
            selected={selectedIds}
            onChange={setSelectedIds}
          />
          <div className="pl-mlist">
            {selected.map((m) => {
              const raw = muscles[m.id] ?? ''
              const num = parsePercent(raw)
              return (
                <div className="pl-mrow" key={m.id}>
                  <span className="pl-mname">{m[lang]}</span>
                  <input
                    type="range"
                    className="pl-range"
                    min={1}
                    max={100}
                    value={num ?? 1}
                    style={{ '--v': `${num ?? 0}%` } as CSSProperties}
                    aria-label={`${p.percent} – ${m[lang]}`}
                    onChange={(e) =>
                      setMuscles((cur) => ({ ...cur, [m.id]: e.target.value }))
                    }
                  />
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
                  <button
                    type="button"
                    className="pl-x pl-x-sm"
                    aria-label={`${p.removeMuscle}: ${m[lang]}`}
                    onClick={() =>
                      setSelectedIds(selectedIds.filter((id) => id !== m.id))
                    }
                  >
                    ✕
                  </button>
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
