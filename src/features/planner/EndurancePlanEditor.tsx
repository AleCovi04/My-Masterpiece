import { useRef, type ComponentProps } from 'react'
import type {
  EnduranceDiscipline,
  EnduranceItem,
  EnduranceStep,
  StepType,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  dissolveBlock,
  formatClock,
  formatDist,
  intensityUnit,
  moveNode,
  parseClock,
  parseDistanceM,
  parseIntensity,
  removeNode,
  shiftNode,
  wrapStep,
  type DistUnit,
  type DropTarget,
} from '../../lib/enduranceTemplate'
import { newId } from '../../lib/ids'
import ActionMenu, { type MenuAction } from './ActionMenu'
import {
  blankFields,
  intensityOk,
  newStep,
  timesOk,
  type DraftEval,
  type Fields,
  type PlanDraft,
} from './endurancePlanDraft'
import { useDragSort } from './useSortable'

const STEP_TYPES: StepType[] = ['warmup', 'work', 'recovery', 'cooldown']

interface DragTarget extends DropTarget {
  line: { top: number; left: number; width: number }
}

interface Props {
  discipline: EnduranceDiscipline
  draft: PlanDraft
  /** Valutazione della bozza (`evalDraft`), calcolata da chi contiene l'editor. */
  ev: DraftEval
  onChange: (fn: (dr: PlanDraft) => PlanDraft) => void
  submitted: boolean
}

/**
 * Piano endurance: modalità semplice (un obiettivo) o strutturata (passi e
 * blocchi "Ripeti N volte", trascinabili). Usato per corsa, bici e nuoto e
 * per ogni frazione di un brick.
 */
export default function EndurancePlanEditor({
  discipline: d,
  draft: dr,
  ev,
  onChange,
  submitted,
}: Props) {
  const { t } = useI18n()
  const p = t.planner
  const listRef = useRef<HTMLDivElement>(null)
  const { tree, fields, reps, goal } = dr
  const totals = ev.totals
  const sStats = ev.simpleStats

  const set = (patch: Partial<PlanDraft>) =>
    onChange((x) => ({ ...x, ...patch }))
  const setTree = (fn: (tr: EnduranceItem[]) => EnduranceItem[]) =>
    onChange((x) => ({ ...x, tree: fn(x.tree) }))

  // ---------- modifica dell'albero ----------

  const setField = (id: string, patch: Partial<Fields>) =>
    onChange((x) => ({
      ...x,
      fields: { ...x.fields, [id]: { ...x.fields[id], ...patch } },
    }))

  /** Nuovi passi con i loro campi vuoti, da mettere nell'albero con `place`. */
  const withSteps = (
    types: StepType[],
    place: (tr: EnduranceItem[], steps: EnduranceStep[]) => EnduranceItem[],
    extraReps?: Record<string, string>,
  ) => {
    const steps = types.map(newStep)
    onChange((x) => ({
      ...x,
      fields: {
        ...x.fields,
        ...Object.fromEntries(steps.map((s) => [s.id, blankFields(d, s.type)])),
      },
      reps: { ...x.reps, ...extraReps },
      tree: place(x.tree, steps),
    }))
  }

  const addStep = () => withSteps(['work'], (tr, [s]) => [...tr, s])
  const addRepeat = () => {
    const id = newId()
    withSteps(
      ['work', 'recovery'],
      (tr, steps) => [...tr, { kind: 'repeat', id, times: 4, steps }],
      { [id]: '4' },
    )
  }
  const addStepIn = (blockId: string) =>
    withSteps(['work'], (tr, [s]) =>
      tr.map((it) =>
        it.kind === 'repeat' && it.id === blockId
          ? { ...it, steps: [...it.steps, s] }
          : it,
      ),
    )
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
    const dup = (s: EnduranceStep): EnduranceStep[] => [s, { ...s, id: copyId }]
    onChange((x) => ({
      ...x,
      fields: { ...x.fields, [copyId]: { ...x.fields[id] } },
      tree: x.tree.flatMap((it): EnduranceItem[] =>
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
    }))
  }
  const wrap = (id: string) => {
    const blockId = newId()
    onChange((x) => ({
      ...x,
      reps: { ...x.reps, [blockId]: '2' },
      tree: wrapStep(x.tree, id, blockId),
    }))
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
    <>
      <div className="pl-fld">
        <span>{p.modeLabel}</span>
        <Seg
          label={p.modeLabel}
          value={dr.mode}
          onChange={(mode) => set({ mode })}
          options={[
            ['simple', p.modeSimple],
            ['structured', p.modeStructured],
          ]}
        />
      </div>

      {dr.mode === 'structured' && (
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

      {dr.mode === 'simple' ? (
        <section className="en-simple">
          <div className="pl-fld">
            <span>{p.goalLabel}</span>
            <Seg
              label={p.goalLabel}
              value={goal}
              onChange={(g) => set({ goal: g })}
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
                    value={dr.sDist}
                    aria-invalid={
                      submitted && parseDistanceM(dr.sDist, dr.sUnit) === null
                    }
                    onChange={(e) => set({ sDist: e.target.value })}
                  />
                  <UnitSelect
                    value={dr.sUnit}
                    onChange={(sUnit) => set({ sUnit })}
                  />
                </span>
              </label>
            ) : (
              <label className="pl-fld">
                <span>{p.time} *</span>
                <input
                  className="pl-inp"
                  inputMode="numeric"
                  placeholder="45:00"
                  value={dr.sTime}
                  aria-invalid={submitted && parseClock(dr.sTime) === null}
                  onChange={(e) => set({ sTime: e.target.value })}
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
                value={dr.sInt}
                aria-invalid={
                  submitted &&
                  dr.sInt.trim() !== '' &&
                  parseIntensity(dr.sInt, d) === null
                }
                onChange={(e) => set({ sInt: e.target.value })}
              />
            </label>
            {ev.simple.intensity !== undefined ? (
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
                />
              </label>
            ) : goal === 'distance' ? (
              <label className="pl-fld">
                <span>
                  {p.time} ({p.optional})
                </span>
                <input
                  className="pl-inp"
                  inputMode="numeric"
                  placeholder="45:00"
                  value={dr.sTime}
                  title={p.needIntensity}
                  aria-invalid={
                    submitted &&
                    dr.sTime.trim() !== '' &&
                    parseClock(dr.sTime) === null
                  }
                  onChange={(e) => set({ sTime: e.target.value })}
                />
              </label>
            ) : (
              <label className="pl-fld">
                <span>
                  {p.distance} ({p.optional})
                </span>
                <span className="en-dist">
                  <input
                    className="pl-inp"
                    inputMode="decimal"
                    value={dr.sDist}
                    title={p.needIntensity}
                    aria-invalid={
                      submitted &&
                      dr.sDist.trim() !== '' &&
                      parseDistanceM(dr.sDist, dr.sUnit) === null
                    }
                    onChange={(e) => set({ sDist: e.target.value })}
                  />
                  <UnitSelect
                    value={dr.sUnit}
                    onChange={(sUnit) => set({ sUnit })}
                  />
                </span>
              </label>
            )}
          </div>
          {submitted && ev.simpleBad && (
            <em className="pl-err">{p.valueInvalid}</em>
          )}
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
            <div className={`tp-list${drag ? ' dragging' : ''}`} ref={listRef}>
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
                            onChange((x) => ({
                              ...x,
                              reps: { ...x.reps, [it.id]: e.target.value },
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
          {submitted && ev.noSteps && (
            <em className="pl-err">{p.stepsRequired}</em>
          )}
          {submitted && !ev.noSteps && ev.structBad && (
            <em className="pl-err">{p.checkEnduranceFields}</em>
          )}
        </section>
      )}
    </>
  )
}

// ---------- interruttore a due vie ----------

export function Seg<V extends string>({
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
