import {
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
} from 'react'
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
  expandSets,
  mergeWithNext,
  moveBlock,
  normalizeSupersets,
  parseHm,
  separate,
  supersetLabels,
} from '../../lib/templates'
import ActionMenu, { type MenuAction } from './ActionMenu'
import ExercisePicker from './ExercisePicker'
import Modal from './Modal'
import TemplateFooter from './TemplateFooter'
import { useSortable } from './useSortable'

// ---------- bozza del modulo: i numeri restano stringhe finché si digita ----------

interface DSet {
  key: string
  reps: string
  rir: string
}

interface DEntry {
  key: string
  exerciseId: Id
  rest: string
  notes: string
  supersetId?: string
  sets: DSet[]
  /** Righe modificate a mano: "Genera serie" chiede conferma prima di sovrascriverle. */
  manual: boolean
}

const blankSet = (): DSet => ({ key: newId(), reps: '10', rir: '2' })

/** Campo vuoto = obiettivo non indicato: è valido e resta vuoto. */
const blank = (raw: string) => raw.trim() === ''

const parseIntIn = (raw: string, min: number, max: number): number | null => {
  const v = raw.trim()
  if (!/^\d{1,3}$/.test(v)) return null
  const n = Number(v)
  return n >= min && n <= max ? n : null
}

const repsBad = (raw: string) => !blank(raw) && parseIntIn(raw, 1, 999) === null
const rirBad = (raw: string) => !blank(raw) && parseIntIn(raw, 0, 10) === null

const toDraft = (e: TemplateEntry): DEntry => ({
  key: newId(),
  exerciseId: e.exerciseId,
  rest: formatMmSs(e.restSeconds),
  notes: e.notes ?? '',
  supersetId: e.supersetId,
  sets: e.sets.map((s) => ({
    key: newId(),
    reps: s.reps === undefined ? '' : String(s.reps),
    rir: s.rir === undefined ? '' : String(s.rir),
  })),
  // serie diverse tra loro: sono state scritte a mano
  manual: e.sets.some(
    (s) => s.reps !== e.sets[0].reps || s.rir !== e.sets[0].rir,
  ),
})

const setBad = (s: DSet) => repsBad(s.reps) || rirBad(s.rir)

// ---------- finestra ----------

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

interface EntryCardProps {
  entry: DEntry
  name: string
  /** Solo l'ultimo esercizio del giro ha il recupero. */
  showRest: boolean
  inSuperset: boolean
  submitted: boolean
  handle: ComponentProps<'button'>
  actions: MenuAction[]
  update: (fn: (e: DEntry) => DEntry) => void
}

function EntryCard({
  entry,
  name,
  showRest,
  inSuperset,
  submitted,
  handle,
  actions,
  update,
}: EntryCardProps) {
  const { t } = useI18n()
  const p = t.planner
  const [quick, setQuick] = useState({ n: '3', reps: '10', rir: '2' })
  const [confirmingGenerate, setConfirmingGenerate] = useState(false)

  const setField = (key: string, field: 'reps' | 'rir', v: string) =>
    update((e) => ({
      ...e,
      manual: true,
      sets: e.sets.map((s) => (s.key === key ? { ...s, [field]: v } : s)),
    }))

  // "N × reps, RIR": reps e RIR lasciati vuoti restano vuoti nelle serie (mai 0)
  const quickN = parseIntIn(quick.n, 1, 20)
  const quickOk = quickN !== null && !repsBad(quick.reps) && !rirBad(quick.rir)

  const generate = () => {
    setConfirmingGenerate(false)
    if (quickN === null || !quickOk) return
    const sets = expandSets(
      quickN,
      parseIntIn(quick.reps, 1, 999),
      parseIntIn(quick.rir, 0, 10),
    )
    update((e) => ({
      ...e,
      manual: false,
      sets: sets.map((s) => ({
        key: newId(),
        reps: s.reps === undefined ? '' : String(s.reps),
        rir: s.rir === undefined ? '' : String(s.rir),
      })),
    }))
  }

  const restError = entry.rest.trim() !== '' && parseMmSs(entry.rest) === null

  return (
    <div className="tp-entry">
      <div className="tp-entry-h">
        <button
          type="button"
          className="tp-handle"
          aria-label={p.dragHandle}
          title={p.dragHandle}
          {...handle}
        >
          ⠿
        </button>
        <b className="tp-entry-name">{name}</b>
        <ActionMenu label={p.exerciseMenu} actions={actions} />
      </div>

      <table className="tp-sets">
        <thead>
          <tr>
            <th>{p.setNo}</th>
            <th>{p.reps}</th>
            <th>RIR</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entry.sets.map((s, i) => (
            <tr key={s.key}>
              <td className="tp-n">{i + 1}</td>
              {(['reps', 'rir'] as const).map((f) => {
                const bad =
                  submitted && (f === 'reps' ? repsBad(s.reps) : rirBad(s.rir))
                return (
                  <td key={f}>
                    <input
                      className="pl-inp pl-num"
                      inputMode="numeric"
                      value={s[f]}
                      aria-label={`${f === 'reps' ? p.reps : 'RIR'} – ${p.setNo} ${i + 1}`}
                      aria-invalid={bad}
                      onChange={(e) => setField(s.key, f, e.target.value)}
                    />
                  </td>
                )
              })}
              <td className="tp-row-actions">
                <span className="tp-ra">
                  <button
                    type="button"
                    className="pl-ico pl-ico-static"
                    title={p.duplicateSet}
                    aria-label={`${p.duplicateSet} ${i + 1}`}
                    onClick={() =>
                      update((e) => ({
                        ...e,
                        sets: e.sets.flatMap((x) =>
                          x.key === s.key ? [x, { ...x, key: newId() }] : [x],
                        ),
                      }))
                    }
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    className="pl-ico pl-ico-static"
                    title={p.deleteSet}
                    aria-label={`${p.deleteSet} ${i + 1}`}
                    disabled={entry.sets.length === 1}
                    onClick={() =>
                      update((e) => ({
                        ...e,
                        sets: e.sets.filter((x) => x.key !== s.key),
                      }))
                    }
                  >
                    ✕
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="tp-tools">
        <button
          type="button"
          className="pl-btn pl-small"
          onClick={() =>
            update((e) => {
              const last = e.sets[e.sets.length - 1] ?? blankSet()
              return { ...e, sets: [...e.sets, { ...last, key: newId() }] }
            })
          }
        >
          + {p.addSet}
        </button>
        <span className="tp-quick" role="group" aria-label={p.quickLabel}>
          <input
            className="pl-inp pl-num"
            inputMode="numeric"
            value={quick.n}
            aria-label={p.quickSets}
            aria-invalid={quickN === null}
            onChange={(e) => setQuick({ ...quick, n: e.target.value })}
          />
          ×
          <input
            className="pl-inp pl-num"
            inputMode="numeric"
            value={quick.reps}
            aria-label={p.reps}
            aria-invalid={repsBad(quick.reps)}
            onChange={(e) => setQuick({ ...quick, reps: e.target.value })}
          />
          {p.reps.toLowerCase()}, RIR
          <input
            className="pl-inp pl-num"
            inputMode="numeric"
            value={quick.rir}
            aria-label="RIR"
            aria-invalid={rirBad(quick.rir)}
            onChange={(e) => setQuick({ ...quick, rir: e.target.value })}
          />
          <button
            type="button"
            className="pl-btn pl-small"
            disabled={!quickOk}
            onClick={() =>
              entry.manual ? setConfirmingGenerate(true) : generate()
            }
          >
            {p.generate}
          </button>
        </span>
      </div>
      {confirmingGenerate && (
        <div className="pl-confirm tp-confirm" role="alert">
          <small>{p.confirmGenerate}</small>
          <button
            type="button"
            className="pl-btn warn pl-small"
            onClick={generate}
          >
            {p.confirmGenerateYes}
          </button>
          <button
            type="button"
            className="pl-btn pl-small"
            onClick={() => setConfirmingGenerate(false)}
          >
            {p.cancel}
          </button>
        </div>
      )}

      <div className="tp-meta">
        {showRest ? (
          <label className="tp-rest">
            <span>{inSuperset ? p.restAfterRound : p.restLabelShort}</span>
            <input
              className="pl-inp pl-short"
              value={entry.rest}
              inputMode="numeric"
              placeholder={formatMmSs(DEFAULT_REST_SECONDS)}
              aria-invalid={submitted && restError}
              onChange={(e) =>
                update((en) => ({ ...en, rest: e.target.value }))
              }
            />
          </label>
        ) : (
          <small className="tp-hint">{p.restInSuperset}</small>
        )}
        <label className="tp-note">
          <span>{p.notes}</span>
          <input
            className="pl-inp"
            value={entry.notes}
            onChange={(e) => update((en) => ({ ...en, notes: e.target.value }))}
          />
        </label>
      </div>
    </div>
  )
}
