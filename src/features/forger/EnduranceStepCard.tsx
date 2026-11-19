import type { ComponentProps } from 'react'
import type {
  EnduranceDiscipline,
  EnduranceStep,
  StepType,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  intensityUnit,
  parseClock,
  parseDistanceM,
  type DistUnit,
} from '../../lib/enduranceTemplate'
import ActionMenu, { type MenuAction } from './ActionMenu'
import { intensityOk, STEP_TYPES, type Fields } from './endurancePlanDraft'
import { Seg } from '../../components/ui/Seg'

export function UnitSelect({
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

export function StepCard({
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
