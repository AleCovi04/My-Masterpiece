import { useEffect, useRef, useState } from 'react'
import { ChevronIcon } from '../../components/ui/Icons'
import type { IsoDate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  PRESET_WEEKS,
  shiftChoice,
  type Granularity,
  type PeriodChoice,
  type PlanEntry,
  type Range,
} from '../../lib/analysis'
import { isIsoDate } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import Modal from '../planner/Modal'

interface Props {
  choice: PeriodChoice
  onChange: (c: PeriodChoice) => void
  entries: PlanEntry[]
  /** Intervallo risultante, per l'etichetta e per partire nel personalizzato. */
  range: Range
  granularity: Granularity
  today: IsoDate
}

type Preset = 'w4' | 'w12' | 'w26' | 'year' | 'all' | 'plan' | 'custom'

const presetOf = (c: PeriodChoice): Preset =>
  c.kind === 'weeks' ? (`w${c.weeks}` as Preset) : c.kind

/** Filtro del periodo: scelte rapide, frecce, date libere e scelta dal Piano. */
export default function PeriodPicker({
  choice,
  onChange,
  entries,
  range,
  granularity,
  today,
}: Props) {
  const { t } = useI18n()
  const a = t.analysis
  const [planOpen, setPlanOpen] = useState(false)
  const date = (d: IsoDate) => formatLongDate(d, t.monthsShort)
  const prev = shiftChoice(choice, -1, entries)
  const next = shiftChoice(choice, 1, entries)
  const active = presetOf(choice)

  const presets: { key: Preset; label: string }[] = [
    ...PRESET_WEEKS.map((w) => ({
      key: `w${w}` as Preset,
      label: w === 26 ? a.sixMonths : a.weeksShort.replace('{n}', String(w)),
    })),
    { key: 'year', label: a.year },
    { key: 'all', label: a.all },
    { key: 'plan', label: a.plan },
    { key: 'custom', label: a.custom },
  ]

  const pick = (key: Preset) => {
    if (key === 'plan') {
      setPlanOpen(true)
      return
    }
    if (key === 'year') onChange({ kind: 'year', year: +today.slice(0, 4) })
    else if (key === 'all') onChange({ kind: 'all' })
    else if (key === 'custom')
      onChange({ kind: 'custom', start: range.start, end: range.end })
    else onChange({ kind: 'weeks', weeks: +key.slice(1), offset: 0 })
  }

  const entry =
    choice.kind === 'plan'
      ? entries.find((e) => e.value === choice.value)
      : undefined
  const title =
    choice.kind === 'weeks'
      ? choice.offset === 0
        ? a.lastWeeks.replace('{n}', String(choice.weeks))
        : a.weeksBlock.replace('{n}', String(choice.weeks))
      : choice.kind === 'year'
        ? String(choice.year)
        : choice.kind === 'all'
          ? a.all
          : choice.kind === 'custom'
            ? a.custom
            : entry
              ? `${entry.kind === 'phase' ? t.plan.phase : t.plan.block} · ${entry.name}`
              : a.plan

  return (
    <div className="pp">
      <div className="pp-presets" role="group" aria-label={a.period}>
        {presets.map((p) => (
          <button
            type="button"
            key={p.key}
            aria-pressed={active === p.key}
            onClick={() => pick(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="pp-nav">
        <button
          type="button"
          className="pp-arrow"
          aria-label={a.prev}
          title={a.prev}
          disabled={!prev}
          onClick={() => prev && onChange(prev)}
        >
          <ChevronIcon />
        </button>
        <div
          className="pp-cur"
          data-phase={entry?.color}
          data-plan={entry ? '' : undefined}
        >
          <b>{title}</b>
          <small>
            {date(range.start)} – {date(range.end)} ·{' '}
            {granularity === 'day' ? a.byDay : a.byWeek}
          </small>
        </div>
        <button
          type="button"
          className="pp-arrow next"
          aria-label={a.next}
          title={a.next}
          disabled={!next}
          onClick={() => next && onChange(next)}
        >
          <ChevronIcon />
        </button>
      </div>

      {choice.kind === 'custom' && (
        <div className="pp-custom">
          <label className="pl-fld">
            <span>{a.from}</span>
            <input
              type="date"
              className="pl-inp"
              value={choice.start}
              max={choice.end}
              onChange={(e) =>
                isIsoDate(e.target.value) &&
                e.target.value <= choice.end &&
                onChange({ ...choice, start: e.target.value })
              }
            />
          </label>
          <label className="pl-fld">
            <span>{a.to}</span>
            <input
              type="date"
              className="pl-inp"
              value={choice.end}
              min={choice.start}
              onChange={(e) =>
                isIsoDate(e.target.value) &&
                e.target.value >= choice.start &&
                onChange({ ...choice, end: e.target.value })
              }
            />
          </label>
        </div>
      )}

      {planOpen && (
        <PlanPickerDialog
          entries={entries}
          selected={choice.kind === 'plan' ? choice.value : null}
          onPick={(value) => {
            onChange({ kind: 'plan', value })
            setPlanOpen(false)
          }}
          onClose={() => setPlanOpen(false)}
        />
      )}
    </div>
  )
}

interface DialogProps {
  entries: PlanEntry[]
  selected: string | null
  onPick: (value: string) => void
  onClose: () => void
}

/** Cronologia del Piano: si sceglie una fase, un blocco singolo o un blocco dentro una fase. */
function PlanPickerDialog({ entries, selected, onPick, onClose }: DialogProps) {
  const { t } = useI18n()
  const a = t.analysis
  const date = (d: IsoDate) => formatLongDate(d, t.monthsShort)
  const apps = entries.filter((e) => e.level === 'app')
  const selectedEntry = entries.find((e) => e.value === selected)
  // aperta: la fase scelta, altrimenti quella in corso
  const focus =
    selectedEntry?.parent ??
    selectedEntry?.value ??
    apps.find((e) => e.timing === 'current')?.value ??
    null
  const [open, setOpen] = useState<string | null>(focus)
  const focusRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  const row = (e: PlanEntry) => (
    <button
      type="button"
      className={`pp-row${e.value === selected ? ' sel' : ''}`}
      data-phase={e.color}
      aria-pressed={e.value === selected}
      onClick={() => onPick(e.value)}
    >
      <i aria-hidden="true" />
      <span>
        <b>
          {e.level === 'app' &&
            `${e.kind === 'phase' ? t.plan.phase : t.plan.block} · `}
          {e.name}
        </b>
        <small>
          {date(e.start)} – {date(e.end)}
        </small>
      </span>
      {e.timing === 'current' && <em>{t.plan.current}</em>}
    </button>
  )

  return (
    <Modal title={a.choosePlan} closeLabel={t.plan.close} onClose={onClose}>
      {apps.length === 0 ? (
        <p className="note">{a.planEmpty}</p>
      ) : (
        <ul className="pp-list">
          {apps.map((app) => {
            const runs = entries.filter((e) => e.parent === app.value)
            const isOpen = open === app.value
            return (
              <li
                key={app.value}
                ref={app.value === focus ? focusRef : undefined}
              >
                <div className="pp-app">
                  {row(app)}
                  {runs.length > 0 && (
                    <button
                      type="button"
                      className={`pp-toggle${isOpen ? ' open' : ''}`}
                      aria-expanded={isOpen}
                      aria-label={a.showBlocks}
                      title={a.showBlocks}
                      onClick={() => setOpen(isOpen ? null : app.value)}
                    >
                      <ChevronIcon />
                    </button>
                  )}
                </div>
                {isOpen && runs.length > 0 && (
                  <ul className="pp-runs">
                    {runs.map((r) => (
                      <li key={r.value}>{row(r)}</li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
