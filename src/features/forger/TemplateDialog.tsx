import { useMemo, useRef, useState, type FormEvent } from 'react'
import type {
  Exercise,
  Id,
  StrengthTemplate,
  TemplateEntry,
} from '../../data/types'
import { DEFAULT_REST_SECONDS } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatMmSs, parseMmSs } from '../../lib/exercises'
import { formatHm } from '../../lib/format'
import { newId } from '../../lib/ids'
import {
  blocks,
  mergeWithNext,
  moveBlock,
  normalizeSupersets,
  parseHm,
  separate,
  supersetLabels,
} from '../../lib/templates'
import type { MenuAction } from './ActionMenu'
import ExercisePicker from './ExercisePicker'
import Modal from '../../components/ui/Modal'
import TemplateFooter from './TemplateFooter'
import { useSortable } from '../../hooks/useSortable'
import {
  type DEntry,
  blankSet,
  parseIntIn,
  toDraft,
  setBad,
} from './templateDraft'
import { EntryCard } from './TemplateEntryCard'

interface Props {
  /** `null` = nuovo allenamento. */
  template: StrengthTemplate | null
  exercises: Exercise[]
  onSave: (t: StrengthTemplate) => void
  onDuplicate: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onClose: () => void
  /**
   * Modifica il piano di una seduta del Calendario: nome facoltativo e
   * niente duplica/archivia/elimina (non è un template).
   */
  forSession?: boolean
}

export default function TemplateDialog({
  template,
  exercises,
  onSave,
  onDuplicate,
  onArchive,
  onDelete,
  onClose,
  forSession = false,
}: Props) {
  const { t } = useI18n()
  const p = t.planner
  const exById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises],
  )

  const [name, setName] = useState(template?.name ?? '')
  const [duration, setDuration] = useState(
    template?.estimatedDurationSec
      ? formatHm(template.estimatedDurationSec)
      : '',
  )
  const [notes, setNotes] = useState(template?.notes ?? '')
  const [entries, setEntries] = useState<DEntry[]>(() =>
    (template?.entries ?? []).map(toDraft),
  )
  const [picking, setPicking] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const { drag, handleProps } = useSortable({
    listRef,
    onMove: (from, to) => setEntries((es) => moveBlock(es, from, to)),
  })

  const bs = blocks(entries)
  const labels = supersetLabels(entries)

  const nameError = name.trim() || forSession ? null : p.nameRequired
  // obbligatoria nei template di forza (mai calcolata); facoltativa nel piano di una seduta
  const durationError =
    duration.trim() === ''
      ? forSession
        ? null
        : p.durationRequired
      : parseHm(duration)
        ? null
        : p.durationInvalid
  const entriesError = entries.length === 0 ? p.entriesRequired : null
  const restBad = (e: DEntry) =>
    e.rest.trim() !== '' && parseMmSs(e.rest) === null
  const anyBad = entries.some((e) => e.sets.some(setBad) || restBad(e))
  const valid = !nameError && !durationError && !entriesError && !anyBad

  const patch = (key: string, fn: (e: DEntry) => DEntry) =>
    setEntries((es) => es.map((e) => (e.key === key ? fn(e) : e)))

  const addExercises = (ids: Id[]) => {
    setEntries((es) => [
      ...es,
      ...ids.map((id) => ({
        key: newId(),
        exerciseId: id,
        rest: formatMmSs(
          exById.get(id)?.defaultRestSeconds ?? DEFAULT_REST_SECONDS,
        ),
        notes: '',
        sets: [blankSet(), blankSet(), blankSet()],
        manual: false,
      })),
    ])
    setPicking(false)
  }

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    setSubmitted(true)
    if (!valid) return
    const now = new Date().toISOString()
    const trimmed = notes.trim()
    const built: TemplateEntry[] = normalizeSupersets(entries).map((e) => {
      const en = e.notes.trim()
      return {
        exerciseId: e.exerciseId,
        restSeconds:
          parseMmSs(e.rest) ??
          exById.get(e.exerciseId)?.defaultRestSeconds ??
          DEFAULT_REST_SECONDS,
        ...(en && { notes: en }),
        ...(e.supersetId && { supersetId: e.supersetId }),
        sets: e.sets.map((s) => {
          const reps = parseIntIn(s.reps, 1, 999)
          const rir = parseIntIn(s.rir, 0, 10)
          return {
            ...(reps !== null && { reps }),
            ...(rir !== null && { rir }),
          }
        }),
      }
    })
    const seconds = duration.trim() ? parseHm(duration) : null
    onSave({
      id: template?.id ?? newId(),
      discipline: 'strength',
      name: name.trim().replace(/\s+/g, ' '),
      ...(trimmed && { notes: trimmed }),
      ...(seconds ? { estimatedDurationSec: seconds } : {}),
      entries: built,
      archived: template?.archived ?? false,
      createdAt: template?.createdAt ?? now,
      updatedAt: now,
    })
  }

  const entryActions = (index: number, blockIndex: number): MenuAction[] => {
    const inSuperset = !!entries[index].supersetId
    return [
      {
        label: p.makeSuperset,
        disabled: blockIndex >= bs.length - 1,
        onSelect: () => setEntries((es) => mergeWithNext(es, index, newId())),
      },
      ...(inSuperset
        ? [
            {
              label: p.separate,
              onSelect: () => setEntries((es) => separate(es, index, newId())),
            },
          ]
        : []),
      {
        label: p.moveUp,
        disabled: blockIndex === 0,
        onSelect: () =>
          setEntries((es) => moveBlock(es, blockIndex, blockIndex - 1)),
      },
      {
        label: p.moveDown,
        disabled: blockIndex >= bs.length - 1,
        onSelect: () =>
          setEntries((es) => moveBlock(es, blockIndex, blockIndex + 1)),
      },
      {
        label: p.removeExercise,
        danger: true,
        onSelect: () =>
          setEntries((es) =>
            normalizeSupersets(es.filter((_, i) => i !== index)),
          ),
      },
    ]
  }

  return (
    <>
      <Modal
        title={
          forSession ? p.editPlan : template ? p.editWorkout : p.newWorkout
        }
        closeLabel={p.close}
        onClose={onClose}
        wide
        backdropClose={false}
      >
        <form className="pl-form" onSubmit={submit} noValidate>
          <div className="tp-top">
            <label className="pl-fld tp-name">
              <span>{forSession ? p.name : `${p.name} *`}</span>
              <input
                className="pl-inp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={submitted && !!nameError}
                autoComplete="off"
              />
              {submitted && nameError && (
                <em className="pl-err">{nameError}</em>
              )}
            </label>
            <label className="pl-fld">
              <span>{forSession ? p.duration : `${p.duration} *`}</span>
              <input
                className="pl-inp pl-short"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="1:15"
                inputMode="numeric"
                aria-required={!forSession}
                aria-invalid={submitted && !!durationError}
              />
              {submitted && durationError && (
                <em className="pl-err">{durationError}</em>
              )}
            </label>
          </div>
          <label className="pl-fld">
            <span>{p.notes}</span>
            <textarea
              className="pl-inp"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <section className="pl-fld tp-section">
            <div className="tp-head">
              <span className="tp-h">
                {p.exercisesTitle} ({entries.length})
              </span>
              <button
                type="button"
                className="pl-btn acc pl-small"
                onClick={() => setPicking(true)}
              >
                + {p.addExercise}
              </button>
            </div>
            {entries.length === 0 ? (
              <div className="ph">{p.noEntries}</div>
            ) : (
              <div
                className={`tp-list${drag ? ' dragging' : ''}`}
                ref={listRef}
              >
                {drag && (
                  <div className="pl-dropline" style={{ top: drag.line }} />
                )}
                {bs.map((b, bi) => {
                  const ssId = entries[b.start].supersetId
                  const label = ssId ? labels.get(ssId) : undefined
                  return (
                    <div
                      key={entries[b.start].key}
                      data-block={bi}
                      data-ss={
                        label ? (label.charCodeAt(0) - 65) % 4 : undefined
                      }
                      className={`tp-block${label ? ' ss' : ''}${drag?.from === bi ? ' lifting' : ''}`}
                    >
                      {label && (
                        <div className="tp-sslabel">
                          {p.superset} {label}
                        </div>
                      )}
                      {entries.slice(b.start, b.end).map((en, k) => (
                        <EntryCard
                          key={en.key}
                          entry={en}
                          name={exById.get(en.exerciseId)?.name ?? '?'}
                          showRest={b.start + k === b.end - 1}
                          inSuperset={!!label}
                          submitted={submitted}
                          handle={handleProps(bi)}
                          actions={entryActions(b.start + k, bi)}
                          update={(fn) => patch(en.key, fn)}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
            {submitted && entriesError && (
              <em className="pl-err">{entriesError}</em>
            )}
            {submitted && anyBad && <em className="pl-err">{p.checkFields}</em>}
          </section>

          {submitted && !valid && (
            <em className="pl-err" role="alert">
              {durationError === p.durationRequired
                ? p.durationRequired
                : p.cannotSave}
            </em>
          )}

          <TemplateFooter
            template={forSession ? null : template}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            onDelete={onDelete}
            onClose={onClose}
          />
        </form>
      </Modal>
      {picking && (
        <ExercisePicker
          exercises={exercises}
          onAdd={addExercises}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )
}

// ---------- una voce (esercizio) con la sua tabella di serie ----------
