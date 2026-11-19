import { useMemo, useRef, useState, type FormEvent } from 'react'
import { DisciplineIcon } from '../../components/ui/Icons'
import {
  BRICK_MAX_LEGS,
  BRICK_MIN_LEGS,
  type BrickLeg,
  type BrickTemplate,
  type EnduranceDiscipline,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { brickTotals, legAmount, moveItem } from '../../lib/brick'
import { formatClock, parseClock } from '../../lib/enduranceTemplate'
import { newId } from '../../lib/ids'
import ActionMenu, { type MenuAction } from './ActionMenu'
import DurationField from './DurationField'
import EndurancePlanEditor from './EndurancePlanEditor'
import Modal from '../../components/ui/Modal'
import TemplateFooter from './TemplateFooter'
import {
  cloneDraft,
  draftFromPlan,
  evalDraft,
  type PlanDraft,
} from './endurancePlanDraft'
import { useSortable } from '../../hooks/useSortable'

const SPORTS: EnduranceDiscipline[] = ['swim', 'bike', 'run']

/** Una frazione mentre si modifica: piano in bozza e transizione come testo. */
interface LegDraft {
  id: string
  discipline: EnduranceDiscipline
  draft: PlanDraft
  transition: string
  open: boolean
}

const legDraft = (leg: BrickLeg, open: boolean): LegDraft => ({
  id: leg.id,
  discipline: leg.discipline,
  draft: draftFromPlan(leg.discipline, leg),
  transition: leg.transitionBeforeS ? formatClock(leg.transitionBeforeS) : '',
  open,
})

const transitionOk = (raw: string) =>
  raw.trim() === '' || parseClock(raw) !== null

interface Props {
  /** `null` = nuovo brick. */
  template: BrickTemplate | null
  onSave: (t: BrickTemplate) => void
  onDuplicate: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onClose: () => void
  /** Modifica il piano di una seduta del Calendario (nome facoltativo). */
  forSession?: boolean
}

/** Editor del brick: frazioni endurance in ordine, con transizioni facoltative. */
export default function BrickDialog({
  template,
  onSave,
  onDuplicate,
  onArchive,
  onDelete,
  onClose,
  forSession = false,
}: Props) {
  const { t } = useI18n()
  const p = t.planner

  const [name, setName] = useState(template?.name ?? '')
  const [notes, setNotes] = useState(template?.notes ?? '')
  // un brick nuovo parte senza frazioni; quelle esistenti partono chiuse, quelle aggiunte aperte
  const [legs, setLegs] = useState<LegDraft[]>(() =>
    (template?.legs ?? []).map((l) => legDraft(l, false)),
  )
  const [override, setOverride] = useState<string | null>(
    template?.estimatedDurationSec
      ? formatClock(template.estimatedDurationSec)
      : null,
  )
  const [submitted, setSubmitted] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)

  const evals = useMemo(
    () => legs.map((l) => evalDraft(l.discipline, l.draft)),
    [legs],
  )
  /** Le frazioni come verrebbero salvate (la prima senza transizione). */
  const built = useMemo<BrickLeg[]>(
    () =>
      legs.map((l, i) => {
        const tr = i > 0 ? parseClock(l.transition) : null
        return {
          id: l.id,
          discipline: l.discipline,
          ...evals[i].content,
          ...(tr ? { transitionBeforeS: tr } : {}),
        }
      }),
    [legs, evals],
  )
  const totals = useMemo(() => brickTotals(built), [built])

  const legOk = (i: number) =>
    evals[i].valid && (i === 0 || transitionOk(legs[i].transition))
  const nameError = name.trim() || forSession ? null : p.nameRequired
  const overrideError =
    override !== null && override.trim() !== '' && parseClock(override) === null
  const countOk = legs.length >= BRICK_MIN_LEGS && legs.length <= BRICK_MAX_LEGS
  const legsOk = legs.every((_, i) => legOk(i))
  const valid = !nameError && !overrideError && countOk && legsOk

  // ---------- frazioni ----------

  const patchLeg = (id: string, patch: Partial<LegDraft>) =>
    setLegs((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const changeDraft = (id: string) => (fn: (dr: PlanDraft) => PlanDraft) =>
    setLegs((ls) =>
      ls.map((l) => (l.id === id ? { ...l, draft: fn(l.draft) } : l)),
    )
  const addLeg = (d: EnduranceDiscipline) =>
    setLegs((ls) =>
      ls.length >= BRICK_MAX_LEGS
        ? ls
        : [
            ...ls,
            {
              id: newId(),
              discipline: d,
              draft: draftFromPlan(d),
              transition: '',
              open: true,
            },
          ],
    )
  const duplicateLeg = (id: string) =>
    setLegs((ls) => {
      if (ls.length >= BRICK_MAX_LEGS) return ls
      const i = ls.findIndex((l) => l.id === id)
      if (i < 0) return ls
      const copy: LegDraft = {
        ...ls[i],
        id: newId(),
        draft: cloneDraft(ls[i].draft),
        open: true,
      }
      return [...ls.slice(0, i + 1), copy, ...ls.slice(i + 1)]
    })
  const removeLeg = (id: string) =>
    setLegs((ls) =>
      ls.length <= BRICK_MIN_LEGS ? ls : ls.filter((l) => l.id !== id),
    )
  const shiftLeg = (i: number, delta: number) =>
    setLegs((ls) => moveItem(ls, i, i + delta))

  const { drag, handleProps } = useSortable({
    listRef,
    onMove: (from, to) => setLegs((ls) => moveItem(ls, from, to)),
  })

  const legActions = (l: LegDraft, i: number): MenuAction[] => [
    {
      label: p.moveUp,
      disabled: i === 0,
      onSelect: () => shiftLeg(i, -1),
    },
    {
      label: p.moveDown,
      disabled: i === legs.length - 1,
      onSelect: () => shiftLeg(i, 1),
    },
    {
      label: p.duplicateLeg,
      disabled: legs.length >= BRICK_MAX_LEGS,
      onSelect: () => duplicateLeg(l.id),
    },
    {
      label: p.removeLeg,
      danger: true,
      disabled: legs.length <= BRICK_MIN_LEGS,
      onSelect: () => removeLeg(l.id),
    },
  ]

  // ---------- salvataggio ----------

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!valid) {
      // apre le frazioni da correggere
      setLegs((ls) => ls.map((l, i) => (legOk(i) ? l : { ...l, open: true })))
      return
    }
    const now = new Date().toISOString()
    const trimmed = notes.trim()
    const seconds = override !== null ? parseClock(override) : null
    onSave({
      id: template?.id ?? newId(),
      discipline: 'brick',
      name: name.trim().replace(/\s+/g, ' '),
      ...(trimmed && { notes: trimmed }),
      ...(seconds ? { estimatedDurationSec: seconds } : {}),
      legs: built,
      archived: template?.archived ?? false,
      createdAt: template?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return (
    <Modal
      title={forSession ? p.editPlan : template ? p.editWorkout : p.newWorkout}
      closeLabel={p.close}
      onClose={onClose}
      wide
      backdropClose={false}
    >
      <form
        className="pl-form"
        onSubmit={submit}
        noValidate
        data-discipline="brick"
      >
        <div className="en-disc">
          <span className="wk-ic">
            <DisciplineIcon discipline="brick" />
          </span>
          <b>{t.discipline.brick}</b>
        </div>

        <label className="pl-fld">
          <span>{forSession ? p.name : `${p.name} *`}</span>
          <input
            className="pl-inp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={submitted && !!nameError}
            autoComplete="off"
          />
          {submitted && nameError && <em className="pl-err">{nameError}</em>}
        </label>

        <div className="en-summary" aria-live="polite">
          <div>
            <small>{p.totalTime}</small>
            <b>
              {totals.durationS > 0
                ? `${totals.durationComplete ? '' : '≥ '}${formatClock(totals.durationS)}`
                : '—'}
            </b>
          </div>
          <div>
            <small>{p.transitionsTotal}</small>
            <b>
              {totals.transitionsS > 0 ? formatClock(totals.transitionsS) : '—'}
            </b>
          </div>
          <div>
            <small>{p.legsTitle}</small>
            <b>{legs.length}</b>
          </div>
        </div>

        <section className="pl-fld tp-section">
          <div className="tp-head">
            <span className="tp-h">{p.legsTitle}</span>
            <span className="en-add">
              {SPORTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="pl-btn pl-small bk-add"
                  data-discipline={d}
                  disabled={legs.length >= BRICK_MAX_LEGS}
                  onClick={() => addLeg(d)}
                >
                  + {t.discipline[d]}
                </button>
              ))}
            </span>
          </div>
          <small className="bk-hint">{p.legsHint}</small>

          {legs.length === 0 && <div className="ph">{p.noLegs}</div>}
          <ol
            className={`tp-list bk-list${drag ? ' dragging' : ''}`}
            ref={listRef}
          >
            {drag && <div className="pl-dropline" style={{ top: drag.line }} />}
            {legs.map((l, i) => {
              const bad = submitted && !legOk(i)
              const summary = legAmount(built[i])
              return (
                <li
                  key={l.id}
                  data-block={i}
                  className={`bk-leg${drag?.from === i ? ' lifting' : ''}`}
                  data-discipline={l.discipline}
                >
                  {i > 0 && (
                    <label className="bk-trans">
                      <span>{p.transitionBefore}</span>
                      <input
                        className="pl-inp pl-short"
                        inputMode="numeric"
                        placeholder="mm:ss"
                        value={l.transition}
                        aria-invalid={submitted && !transitionOk(l.transition)}
                        onChange={(e) =>
                          patchLeg(l.id, { transition: e.target.value })
                        }
                      />
                    </label>
                  )}
                  <div className="bk-card" aria-invalid={bad}>
                    <div className="bk-head">
                      <button
                        type="button"
                        className="tp-handle"
                        aria-label={p.legDragHandle}
                        title={p.legDragHandle}
                        {...handleProps(i)}
                      >
                        ⠿
                      </button>
                      <span className="wk-ic">
                        <DisciplineIcon discipline={l.discipline} />
                      </span>
                      <button
                        type="button"
                        className="bk-toggle"
                        aria-expanded={l.open}
                        onClick={() => patchLeg(l.id, { open: !l.open })}
                      >
                        <b>
                          {p.legWord} {i + 1} · {t.discipline[l.discipline]}
                        </b>
                        {summary && <small>{summary}</small>}
                      </button>
                      <ActionMenu
                        label={p.legMenu}
                        actions={legActions(l, i)}
                      />
                    </div>
                    {l.open && (
                      <div className="bk-body">
                        <EndurancePlanEditor
                          discipline={l.discipline}
                          draft={l.draft}
                          ev={evals[i]}
                          onChange={changeDraft(l.id)}
                          submitted={submitted}
                        />
                      </div>
                    )}
                    {bad && !l.open && (
                      <em className="pl-err">{p.checkEnduranceFields}</em>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
          {submitted && !countOk && (
            <em className="pl-err">{p.legsRequired}</em>
          )}
          {submitted && !legsOk && <em className="pl-err">{p.checkLegs}</em>}
        </section>

        <DurationField
          override={override}
          auto={totals.durationS > 0 ? totals.durationS : null}
          partial={!totals.durationComplete}
          onChange={setOverride}
        />

        <label className="pl-fld">
          <span>{p.notes}</span>
          <textarea
            className="pl-inp"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <TemplateFooter
          template={forSession ? null : template}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onDelete={onDelete}
          onClose={onClose}
        />
      </form>
    </Modal>
  )
}
