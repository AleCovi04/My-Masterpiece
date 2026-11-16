import {
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
} from 'react'
import { DisciplineIcon } from '../../components/ui/Icons'
import type {
  EnduranceDiscipline,
  EnduranceItem,
  EnduranceSimple,
  EnduranceStep,
  EnduranceTemplate,
  StepType,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  dissolveBlock,
  distanceDraft,
  formatClock,
  formatDist,
  intensityText,
  intensityUnit,
  itemsTotals,
  moveNode,
  parseClock,
  parseDistanceM,
  parseIntensity,
  removeNode,
  shiftNode,
  simpleStats,
  wrapStep,
  type DistUnit,
  type DropTarget,
} from '../../lib/enduranceTemplate'
import { newId } from '../../lib/ids'
import ActionMenu, { type MenuAction } from './ActionMenu'
import Modal from './Modal'
import TemplateFooter from './TemplateFooter'
import { useDragSort } from './useSortable'

// ---------- bozza: i numeri restano stringhe finché si digita ----------

/** I campi digitati di un passo; il tipo e l'ordine stanno nell'albero. */
interface Fields {
  by: 'distance' | 'time'
  dist: string
  unit: DistUnit
  time: string
  intensity: string
  notes: string
}

const STEP_TYPES: StepType[] = ['warmup', 'work', 'recovery', 'cooldown']
const MAX_TIMES = 99

const stepUnit = (d: EnduranceDiscipline): DistUnit =>
  d === 'bike' ? 'km' : 'm'
const simpleUnit = (d: EnduranceDiscipline): DistUnit =>
  d === 'swim' ? 'm' : 'km'

const blankFields = (d: EnduranceDiscipline, type: StepType): Fields => ({
  by: type === 'recovery' ? 'time' : 'distance',
  dist: '',
  unit: stepUnit(d),
  time: '',
  intensity: '',
  notes: '',
})

const newStep = (type: StepType): EnduranceStep => ({
  kind: 'step',
  id: newId(),
  type,
})

const fieldsOf = (s: EnduranceStep, d: EnduranceDiscipline): Fields => {
  const dist = s.distanceM !== undefined ? distanceDraft(s.distanceM) : null
  return {
    by: s.distanceM !== undefined ? 'distance' : 'time',
    dist: dist?.text ?? '',
    unit: dist?.unit ?? stepUnit(d),
    time: s.durationS !== undefined ? formatClock(s.durationS) : '',
    intensity: s.intensity !== undefined ? intensityText(s.intensity, d) : '',
    notes: s.notes ?? '',
  }
}

/** Valore principale (distanza o tempo) valido? */
const mainOk = (f: Fields) =>
  f.by === 'distance'
    ? parseDistanceM(f.dist, f.unit) !== null
    : parseClock(f.time) !== null
const intensityOk = (f: Fields, d: EnduranceDiscipline) =>
  f.intensity.trim() === '' || parseIntensity(f.intensity, d) !== null
const timesOk = (raw: string) => {
  const v = raw.trim()
  return /^\d{1,2}$/.test(v) && Number(v) >= 2 && Number(v) <= MAX_TIMES
}

/** Passo vero a partire da albero e campi; i valori non validi diventano "mancanti". */
function buildStep(
  s: EnduranceStep,
  f: Fields,
  d: EnduranceDiscipline,
): EnduranceStep {
  const distanceM = f.by === 'distance' ? parseDistanceM(f.dist, f.unit) : null
  const durationS = f.by === 'time' ? parseClock(f.time) : null
  const intensity = f.intensity.trim() ? parseIntensity(f.intensity, d) : null
  const notes = f.notes.trim()
  return {
    kind: 'step',
    id: s.id,
    type: s.type,
    ...(distanceM !== null && { distanceM }),
    ...(durationS !== null && { durationS }),
    ...(intensity !== null && { intensity }),
    ...(notes && { notes }),
  }
}

// ---------- finestra ----------

interface Props {
  discipline: EnduranceDiscipline
  /** `null` = nuovo allenamento. */
  template: EnduranceTemplate | null
  onSave: (t: EnduranceTemplate) => void
  onDuplicate: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onClose: () => void
}

interface DragTarget extends DropTarget {
  line: { top: number; left: number; width: number }
}

export default function EnduranceDialog({
  discipline: d,
  template,
  onSave,
  onDuplicate,
  onArchive,
  onDelete,
  onClose,
}: Props) {
  const { t } = useI18n()
  const p = t.planner

  const [name, setName] = useState(template?.name ?? '')
  const [notes, setNotes] = useState(template?.notes ?? '')
  const [mode, setMode] = useState<'simple' | 'structured'>(
    template?.mode ?? 'simple',
  )

  // modalità semplice
  const sm = template?.simple
  const smDist =
    sm?.distanceM !== undefined ? distanceDraft(sm.distanceM) : null
  const [goal, setGoal] = useState<'distance' | 'time'>(sm?.goal ?? 'distance')
  const [sDist, setSDist] = useState(smDist?.text ?? '')
  const [sUnit, setSUnit] = useState<DistUnit>(smDist?.unit ?? simpleUnit(d))
  const [sTime, setSTime] = useState(
    sm?.durationS !== undefined ? formatClock(sm.durationS) : '',
  )
  const [sInt, setSInt] = useState(
    sm?.intensity !== undefined ? intensityText(sm.intensity, d) : '',
  )

  // modalità strutturata: albero (tipo e ordine) + campi digitati per id
  const [tree, setTree] = useState<EnduranceItem[]>(() => template?.items ?? [])
  const [fields, setFields] = useState<Record<string, Fields>>(() => {
    const map: Record<string, Fields> = {}
    for (const it of template?.items ?? [])
      for (const s of it.kind === 'repeat' ? it.steps : [it])
        map[s.id] = fieldsOf(s, d)
    return map
  })
  const [reps, setReps] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const it of template?.items ?? [])
      if (it.kind === 'repeat') map[it.id] = String(it.times)
    return map
  })

  // durata: `null` = automatica, altrimenti il testo scritto a mano
  const [override, setOverride] = useState<string | null>(
    template?.estimatedDurationSec
      ? formatClock(template.estimatedDurationSec)
      : null,
  )
  const [submitted, setSubmitted] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // ---------- calcoli dal vivo ----------

  const items = useMemo<EnduranceItem[]>(
    () =>
      tree.map((it) =>
        it.kind === 'step'
          ? buildStep(it, fields[it.id], d)
          : {
              ...it,
              times: timesOk(reps[it.id] ?? '') ? Number(reps[it.id]) : 1,
              steps: it.steps.map((s) => buildStep(s, fields[s.id], d)),
            },
      ),
    [tree, fields, reps, d],
  )
  const totals = useMemo(() => itemsTotals(d, items), [d, items])

  const simple = useMemo<EnduranceSimple>(() => {
    const intensity = sInt.trim() ? parseIntensity(sInt, d) : null
    const distanceM = parseDistanceM(sDist, sUnit)
    const durationS = parseClock(sTime)
    return {
      goal,
      ...(goal === 'distance' && distanceM !== null && { distanceM }),
      ...(goal === 'time' && durationS !== null && { durationS }),
      ...(intensity !== null && { intensity }),
    }
  }, [d, goal, sDist, sUnit, sTime, sInt])
  const sStats = useMemo(() => simpleStats(d, simple), [d, simple])

  const autoDuration =
    mode === 'simple'
      ? sStats.durationS
      : totals.durationS > 0
        ? totals.durationS
        : null

  // ---------- validazione ----------

  const nameError = name.trim() ? null : p.nameRequired
  const overrideError =
    override !== null && override.trim() !== '' && parseClock(override) === null
      ? p.clockInvalid
      : null

  const simpleBad =
    (goal === 'distance'
      ? parseDistanceM(sDist, sUnit) === null
      : parseClock(sTime) === null) ||
    (sInt.trim() !== '' && parseIntensity(sInt, d) === null)

  const allSteps = tree.flatMap((it) =>
    it.kind === 'repeat' ? it.steps : [it],
  )
  const structBad =
    allSteps.some(
      (s) => !mainOk(fields[s.id]) || !intensityOk(fields[s.id], d),
    ) || tree.some((it) => it.kind === 'repeat' && !timesOk(reps[it.id] ?? ''))
  const stepsError = tree.length === 0 ? p.stepsRequired : null
  const valid =
    !nameError &&
    !overrideError &&
    (mode === 'simple' ? !simpleBad : !stepsError && !structBad)

  // ---------- modifica dell'albero ----------

  const setField = (id: string, patch: Partial<Fields>) =>
    setFields((f) => ({ ...f, [id]: { ...f[id], ...patch } }))

  const makeStep = (type: StepType): EnduranceStep => {
    const s = newStep(type)
    setFields((f) => ({ ...f, [s.id]: blankFields(d, type) }))
    return s
  }

  const addStep = () => setTree((tr) => [...tr, makeStep('work')])
  const addRepeat = () => {
    const id = newId()
    setReps((r) => ({ ...r, [id]: '4' }))
    setTree((tr) => [
      ...tr,
      {
        kind: 'repeat',
        id,
        times: 4,
        steps: [makeStep('work'), makeStep('recovery')],
      },
    ])
  }
  const addStepIn = (blockId: string) => {
    const s = makeStep('work')
    setTree((tr) =>
      tr.map((it) =>
        it.kind === 'repeat' && it.id === blockId
          ? { ...it, steps: [...it.steps, s] }
          : it,
      ),
    )
  }
  const setType = (id: string, type: StepType) =>
    setTree((tr) =>
      tr.map((it) =>
        it.kind === 'step'
          ? it.id === id
            ? { ...it, type }
            : it
          : {
              ...it,
              steps: it.steps.map((s) => (s.id === id ? { ...s, type } : s)),
            },
      ),
    )
  const duplicateStep = (id: string) => {
    const copyId = newId()
    setFields((f) => ({ ...f, [copyId]: { ...f[id] } }))
    const dup = (s: EnduranceStep): EnduranceStep[] => [s, { ...s, id: copyId }]
    setTree((tr) =>
      tr.flatMap((it): EnduranceItem[] =>
        it.kind === 'step'
          ? it.id === id
            ? dup(it)
            : [it]
          : [
              {
                ...it,
                steps: it.steps.flatMap((s) => (s.id === id ? dup(s) : [s])),
              },
            ],
      ),
    )
  }
  const wrap = (id: string) => {
    const blockId = newId()
    setReps((r) => ({ ...r, [blockId]: '2' }))
    setTree((tr) => wrapStep(tr, id, blockId))
  }

  // ---------- trascinamento: passi e blocchi, anche dentro e fuori dai blocchi ----------

  const locate = (id: string, _x: number, y: number): DragTarget | null => {
    void _x
    const root = listRef.current
    if (!root) return null
    const rootBox = root.getBoundingClientRect()
    const dragged = root.querySelector<HTMLElement>(`[data-node="${id}"]`)
    const isBlock = dragged?.dataset.kind === 'repeat'

    const nodesOf = (box: HTMLElement) =>
      Array.from(
        box.querySelectorAll<HTMLElement>(':scope > [data-node]'),
      ).filter((n) => n.dataset.node !== id)

    // un passo trascinato sopra un blocco entra nel blocco
    let parentId: string | null = null
    let box: HTMLElement = root
    if (!isBlock) {
      for (const b of nodesOf(root)) {
        if (b.dataset.kind !== 'repeat') continue
        const r = b.getBoundingClientRect()
        if (y >= r.top && y <= r.bottom) {
          const inner = b.querySelector<HTMLElement>(':scope > [data-children]')
          if (inner) {
            parentId = b.dataset.node ?? null
            box = inner
          }
          break
        }
      }
    }

    const nodes = nodesOf(box)
    const bb = box.getBoundingClientRect()
    const lines = nodes.length
      ? [
          nodes[0].getBoundingClientRect().top - 6,
          ...nodes
            .slice(1)
            .map(
              (n, i) =>
                (nodes[i].getBoundingClientRect().bottom +
                  n.getBoundingClientRect().top) /
                2,
            ),
          nodes[nodes.length - 1].getBoundingClientRect().bottom + 6,
        ]
      : [bb.top]
    let index = 0
    for (let i = 1; i < lines.length; i++)
      if (Math.abs(lines[i] - y) < Math.abs(lines[index] - y)) index = i
    return {
      parentId,
      index,
      line: {
        top: lines[index] - rootBox.top,
        left: bb.left - rootBox.left,
        width: bb.width,
      },
    }
  }

  const { drag, handleProps } = useDragSort<string, DragTarget>({
    listRef,
    locate,
    onDrop: (id, target) => setTree((tr) => moveNode(tr, id, target)),
  })

  // ---------- salvataggio ----------

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    setSubmitted(true)
    if (!valid) return
    const now = new Date().toISOString()
    const trimmed = notes.trim()
    const seconds = override !== null ? parseClock(override) : null
    const built: EnduranceItem[] = items.map((it) =>
      it.kind === 'repeat' ? { ...it, times: Number(reps[it.id]) } : it,
    )
    onSave({
      id: template?.id ?? newId(),
      discipline: d,
      mode,
      name: name.trim().replace(/\s+/g, ' '),
      ...(trimmed && { notes: trimmed }),
      ...(seconds ? { estimatedDurationSec: seconds } : {}),
      ...(mode === 'simple' ? { simple } : { items: built }),
      archived: template?.archived ?? false,
      createdAt: template?.createdAt ?? now,
      updatedAt: now,
    } as EnduranceTemplate)
  }

  // ---------- azioni dei menu ----------

  const stepActions = (id: string, inBlock: boolean): MenuAction[] => [
    {
      label: p.moveUp,
      onSelect: () => setTree((tr) => shiftNode(tr, id, -1)),
    },
    {
      label: p.moveDown,
      onSelect: () => setTree((tr) => shiftNode(tr, id, 1)),
    },
    { label: p.duplicateStep, onSelect: () => duplicateStep(id) },
    ...(inBlock ? [] : [{ label: p.repeatStep, onSelect: () => wrap(id) }]),
    {
      label: p.removeStep,
      danger: true,
      onSelect: () => setTree((tr) => removeNode(tr, id)),
    },
  ]
  const blockActions = (id: string): MenuAction[] => [
    {
      label: p.moveUp,
      onSelect: () => setTree((tr) => shiftNode(tr, id, -1)),
    },
    {
      label: p.moveDown,
      onSelect: () => setTree((tr) => shiftNode(tr, id, 1)),
    },
    {
      label: p.dissolveBlock,
      onSelect: () => setTree((tr) => dissolveBlock(tr, id)),
    },
    {
      label: p.removeBlock,
      danger: true,
      onSelect: () => setTree((tr) => removeNode(tr, id)),
    },
  ]

  const intensityLabel =
    d === 'run'
      ? p.intensityRun
      : d === 'swim'
        ? p.intensitySwim
        : p.intensityBike
  const intensityHint = d === 'bike' ? '28' : d === 'run' ? '5:30' : '1:45'

  const stepCard = (s: EnduranceStep, inBlock: boolean) => (
    <StepCard
      key={s.id}
      step={s}
      fields={fields[s.id]}
      discipline={d}
      submitted={submitted}
      dragging={drag?.key === s.id}
      handle={handleProps(s.id)}
      actions={stepActions(s.id, inBlock)}
      onType={(type) => setType(s.id, type)}
      onField={(patch) => setField(s.id, patch)}
    />
  )

  return (
    <Modal
      title={template ? p.editWorkout : p.newWorkout}
      closeLabel={p.close}
      onClose={onClose}
      wide
      backdropClose={false}
    >
      <form
        className="pl-form"
        onSubmit={submit}
        noValidate
        data-discipline={d}
      >
        <div className="en-disc">
          <span className="wk-ic">
            <DisciplineIcon discipline={d} />
          </span>
          <b>{t.discipline[d]}</b>
        </div>

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

        <div className="pl-fld">
          <span>{p.modeLabel}</span>
          <Seg
            label={p.modeLabel}
            value={mode}
            onChange={setMode}
            options={[
              ['simple', p.modeSimple],
              ['structured', p.modeStructured],
            ]}
          />
        </div>

        {mode === 'structured' && (
          <div className="en-summary" aria-live="polite">
            <div>
              <small>{p.totalDistance}</small>
              <b>
                {totals.distanceM > 0
                  ? `${totals.distanceComplete ? '' : '≥ '}${formatDist(totals.distanceM, d)}`
                  : '—'}
              </b>
            </div>
            <div>
              <small>{p.totalTime}</small>
              <b>
                {totals.durationS > 0
                  ? `${totals.durationComplete ? '' : '≥ '}${formatClock(totals.durationS)}`
                  : '—'}
              </b>
            </div>
            {tree.length > 0 &&
              (!totals.distanceComplete || !totals.durationComplete) && (
                <small className="en-partial">{p.partialNote}</small>
              )}
          </div>
        )}

        {mode === 'simple' ? (
          <section className="en-simple">
            <div className="pl-fld">
              <span>{p.goalLabel}</span>
              <Seg
                label={p.goalLabel}
                value={goal}
                onChange={setGoal}
                options={[
                  ['distance', p.goalDistance],
                  ['time', p.goalTime],
                ]}
              />
            </div>
            <div className="en-grid">
              {goal === 'distance' ? (
                <label className="pl-fld">
                  <span>{p.distance} *</span>
                  <span className="en-dist">
                    <input
                      className="pl-inp"
                      inputMode="decimal"
                      value={sDist}
                      aria-invalid={
                        submitted && parseDistanceM(sDist, sUnit) === null
                      }
                      onChange={(e) => setSDist(e.target.value)}
                    />
                    <UnitSelect value={sUnit} onChange={setSUnit} />
                  </span>
                </label>
              ) : (
                <label className="pl-fld">
                  <span>{p.time} *</span>
                  <input
                    className="pl-inp"
                    inputMode="numeric"
                    placeholder="45:00"
                    value={sTime}
                    aria-invalid={submitted && parseClock(sTime) === null}
                    onChange={(e) => setSTime(e.target.value)}
                  />
                </label>
              )}
              <label className="pl-fld">
                <span>
                  {intensityLabel} ({p.optional})
                </span>
                <input
                  className="pl-inp"
                  inputMode={d === 'bike' ? 'decimal' : 'numeric'}
                  placeholder={intensityHint}
                  value={sInt}
                  aria-invalid={
                    submitted &&
                    sInt.trim() !== '' &&
                    parseIntensity(sInt, d) === null
                  }
                  onChange={(e) => setSInt(e.target.value)}
                />
              </label>
              <label className="pl-fld en-calc">
                <span>
                  {goal === 'distance' ? p.computedTime : p.computedDistance}
                </span>
                <input
                  className="pl-inp"
                  readOnly
                  tabIndex={-1}
                  value={
                    goal === 'distance'
                      ? sStats.durationS !== null
                        ? formatClock(sStats.durationS)
                        : ''
                      : sStats.distanceM !== null
                        ? formatDist(sStats.distanceM, d)
                        : ''
                  }
                  placeholder="—"
                  title={
                    simple.intensity === undefined ? p.needIntensity : undefined
                  }
                />
              </label>
            </div>
          </section>
        ) : (
          <section className="pl-fld tp-section">
            <div className="tp-head">
              <span className="tp-h">{p.stepsTitle}</span>
              <span className="en-add">
                <button
                  type="button"
                  className="pl-btn acc pl-small"
                  onClick={addStep}
                >
                  + {p.addStep}
                </button>
                <button
                  type="button"
                  className="pl-btn pl-small"
                  onClick={addRepeat}
                >
                  + {p.addRepeat}
                </button>
              </span>
            </div>
            {tree.length === 0 ? (
              <div className="ph">{p.noSteps}</div>
            ) : (
              <div
                className={`tp-list${drag ? ' dragging' : ''}`}
                ref={listRef}
              >
                {drag && (
                  <div
                    className="pl-dropline"
                    style={{
                      top: drag.target.line.top,
                      left: drag.target.line.left,
                      right: 'auto',
                      width: drag.target.line.width,
                    }}
                  />
                )}
                {tree.map((it) =>
                  it.kind === 'step' ? (
                    stepCard(it, false)
                  ) : (
                    <div
                      key={it.id}
                      data-node={it.id}
                      data-kind="repeat"
                      className={`en-repeat${drag?.key === it.id ? ' lifting' : ''}`}
                    >
                      <div className="en-repeat-h">
                        <button
                          type="button"
                          className="tp-handle"
                          aria-label={p.blockDragHandle}
                          title={p.blockDragHandle}
                          {...handleProps(it.id)}
                        >
                          ⠿
                        </button>
                        <span className="en-times">
                          {p.repeatWord}
                          <input
                            className="pl-inp pl-num"
                            inputMode="numeric"
                            value={reps[it.id] ?? ''}
                            aria-label={p.repeatTimes}
                            aria-invalid={
                              submitted && !timesOk(reps[it.id] ?? '')
                            }
                            onChange={(e) =>
                              setReps((r) => ({
                                ...r,
                                [it.id]: e.target.value,
                              }))
                            }
                          />
                          {p.timesWord}
                        </span>
                        <ActionMenu
                          label={p.blockMenu}
                          actions={blockActions(it.id)}
                        />
                      </div>
                      <div className="en-children" data-children={it.id}>
                        {it.steps.map((s) => stepCard(s, true))}
                      </div>
                      <button
                        type="button"
                        className="pl-btn pl-small en-addin"
                        onClick={() => addStepIn(it.id)}
                      >
                        + {p.addStepInBlock}
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}
            {submitted && stepsError && (
              <em className="pl-err">{stepsError}</em>
            )}
            {submitted && !stepsError && structBad && (
              <em className="pl-err">{p.checkEnduranceFields}</em>
            )}
          </section>
        )}

        <div className="pl-fld">
          <span>{p.durationEst}</span>
          <div className="en-dur">
            <input
              className="pl-inp pl-short"
              inputMode="numeric"
              placeholder="—"
              value={
                override ??
                (autoDuration !== null ? formatClock(autoDuration) : '')
              }
              aria-label={p.durationEst}
              aria-invalid={!!overrideError}
              onChange={(e) => setOverride(e.target.value)}
            />
            {override !== null ? (
              <button
                type="button"
                className="pl-btn pl-small"
                onClick={() => setOverride(null)}
              >
                {p.restoreAuto}
              </button>
            ) : null}
          </div>
          <small>
            {override !== null
              ? p.durationManual
              : autoDuration !== null
                ? p.durationAuto
                : p.durationNone}
          </small>
          {overrideError && <em className="pl-err">{overrideError}</em>}
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

        {submitted && mode === 'simple' && simpleBad && (
          <em className="pl-err">{p.valueInvalid}</em>
        )}

        <TemplateFooter
          template={template}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onDelete={onDelete}
          onClose={onClose}
        />
      </form>
    </Modal>
  )
}

// ---------- interruttore a due vie ----------

function Seg<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: V
  onChange: (v: V) => void
  options: [V, string][]
}) {
  return (
    <div className="en-seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function UnitSelect({
  value,
  onChange,
}: {
  value: DistUnit
  onChange: (u: DistUnit) => void
}) {
  const { t } = useI18n()
  return (
    <select
      className="pl-inp en-unit"
      value={value}
      aria-label={t.planner.unitLabel}
      onChange={(e) => onChange(e.target.value as DistUnit)}
    >
      <option value="m">m</option>
      <option value="km">km</option>
    </select>
  )
}

// ---------- un passo ----------

interface StepCardProps {
  step: EnduranceStep
  fields: Fields
  discipline: EnduranceDiscipline
  submitted: boolean
  dragging: boolean
  handle: ComponentProps<'button'>
  actions: MenuAction[]
  onType: (type: StepType) => void
  onField: (patch: Partial<Fields>) => void
}

function StepCard({
  step,
  fields: f,
  discipline: d,
  submitted,
  dragging,
  handle,
  actions,
  onType,
  onField,
}: StepCardProps) {
  const { t } = useI18n()
  const p = t.planner
  const intensityLabel =
    d === 'run'
      ? p.intensityRun
      : d === 'swim'
        ? p.intensitySwim
        : p.intensityBike

  return (
    <div
      className={`en-step${dragging ? ' lifting' : ''}`}
      data-node={step.id}
      data-kind="step"
      data-type={step.type}
    >
      <div className="en-step-h">
        <button
          type="button"
          className="tp-handle"
          aria-label={p.stepDragHandle}
          title={p.stepDragHandle}
          {...handle}
        >
          ⠿
        </button>
        <select
          className="pl-inp en-type"
          value={step.type}
          aria-label={p.stepTypeLabel}
          onChange={(e) => onType(e.target.value as StepType)}
        >
          {STEP_TYPES.map((k) => (
            <option key={k} value={k}>
              {p.stepType[k]}
            </option>
          ))}
        </select>
        <ActionMenu label={p.stepMenu} actions={actions} />
      </div>

      <div className="en-grid">
        <div className="pl-fld">
          <Seg
            label={p.stepNo}
            value={f.by}
            onChange={(by) => onField({ by })}
            options={[
              ['distance', p.distance],
              ['time', p.time],
            ]}
          />
          {f.by === 'distance' ? (
            <span className="en-dist">
              <input
                className="pl-inp"
                inputMode="decimal"
                value={f.dist}
                aria-label={p.distance}
                aria-invalid={
                  submitted && parseDistanceM(f.dist, f.unit) === null
                }
                onChange={(e) => onField({ dist: e.target.value })}
              />
              <UnitSelect
                value={f.unit}
                onChange={(unit) => onField({ unit })}
              />
            </span>
          ) : (
            <input
              className="pl-inp"
              inputMode="numeric"
              placeholder="mm:ss"
              value={f.time}
              aria-label={p.time}
              aria-invalid={submitted && parseClock(f.time) === null}
              onChange={(e) => onField({ time: e.target.value })}
            />
          )}
        </div>
        <label className="pl-fld">
          <span>{intensityLabel}</span>
          <input
            className="pl-inp"
            inputMode={d === 'bike' ? 'decimal' : 'numeric'}
            placeholder={intensityUnit(d)}
            value={f.intensity}
            aria-invalid={submitted && !intensityOk(f, d)}
            onChange={(e) => onField({ intensity: e.target.value })}
          />
        </label>
      </div>

      <input
        className="pl-inp"
        value={f.notes}
        placeholder={p.notesStep}
        aria-label={p.notesStep}
        onChange={(e) => onField({ notes: e.target.value })}
      />
    </div>
  )
}
