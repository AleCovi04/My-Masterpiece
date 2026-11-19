import { useEffect, useRef, useState } from 'react'
import { ChevronIcon } from '../../components/ui/Icons'
import type { IsoDate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  LAST_MAX,
  LAST_UNITS,
  shiftChoice,
  type Granularity,
  type LastUnit,
  type PeriodChoice,
  type PlanEntry,
  type Range,
} from '../../lib/analysis'
import { isIsoDate } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import Modal from '../../components/ui/Modal'

interface Props {
  choice: PeriodChoice
  onChange: (c: PeriodChoice) => void
  entries: PlanEntry[]
  /** Intervallo risultante, per l'etichetta e per partire nel personalizzato. */
  range: Range
  granularity: Granularity
}

/** Valori iniziali dei campi numerici. */
const START_N: Record<LastUnit, number> = { week: 6, month: 3, year: 1 }

const plural = (pair: string[], n: number) =>
  (n === 1 ? pair[0] : pair[1]).replace('{n}', String(n))

/** Filtro del periodo: N settimane/mesi/anni, Tutto, Piano, date libere; frecce per spostarsi. */
export default function PeriodPicker({
  choice,
  onChange,
  entries,
  range,
  granularity,
}: Props) {
  const { t } = useI18n()
  const a = t.analysis
  const [planOpen, setPlanOpen] = useState(false)
  const date = (d: IsoDate) => formatLongDate(d, t.monthsShort)
  const prev = shiftChoice(choice, -1, entries)
  const next = shiftChoice(choice, 1, entries)

  // testo dei campi: si può scrivere liberamente, vale solo un numero valido
  const [drafts, setDrafts] = useState<Record<LastUnit, string>>(() => {
    const d = { week: '', month: '', year: '' }
    for (const u of LAST_UNITS)
      d[u] = String(
        choice.kind === 'last' && choice.unit === u ? choice.n : START_N[u],
      )
    return d
  })

  const valid = (u: LastUnit, text: string) => {
    const n = Number(text)
    return Number.isInteger(n) && n >= 1 && n <= LAST_MAX[u] ? n : null
  }
  const pickLast = (u: LastUnit, text: string) => {
    const n = valid(u, text)
    if (n !== null) onChange({ kind: 'last', unit: u, n, offset: 0 })
  }

  const entry =
    choice.kind === 'plan'
      ? entries.find((e) => e.value === choice.value)
      : undefined
  const title =
    choice.kind === 'last'
      ? choice.offset === 0
        ? plural(a.last[choice.unit], choice.n)
        : plural(a.span[choice.unit], choice.n)
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
        {LAST_UNITS.map((u) => {
          const active = choice.kind === 'last' && choice.unit === u
          const unitLabel =
            valid(u, drafts[u]) === 1 ? a.unitShortOne[u] : a.unitShort[u]
          return (
            <label
              key={u}
              className={`pp-num${active ? ' on' : ''}`}
              data-unit={u}
            >
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={LAST_MAX[u]}
                value={drafts[u]}
                aria-label={a.howMany.replace('{u}', a.unitShort[u])}
                onFocus={(e) => {
                  e.target.select()
                  if (!active) pickLast(u, drafts[u])
                }}
                onChange={(e) => {
                  const text = e.target.value
                  setDrafts((d) => ({ ...d, [u]: text }))
                  pickLast(u, text)
                }}
                onBlur={() => {
                  if (valid(u, drafts[u]) === null)
                    setDrafts((d) => ({
                      ...d,
                      [u]: String(
                        choice.kind === 'last' && choice.unit === u
                          ? choice.n
                          : START_N[u],
                      ),
                    }))
                }}
              />
              <span>{unitLabel}</span>
            </label>
          )
        })}
        <button
          type="button"
          aria-pressed={choice.kind === 'all'}
          onClick={() => onChange({ kind: 'all' })}
        >
          {a.all}
        </button>
        <button
          type="button"
          aria-pressed={choice.kind === 'plan'}
          onClick={() => setPlanOpen(true)}
        >
          {a.plan}
        </button>
        <button
          type="button"
          aria-pressed={choice.kind === 'custom'}
          onClick={() =>
            onChange({ kind: 'custom', start: range.start, end: range.end })
          }
        >
          {a.custom}
        </button>
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
          data-phase={entry?.kind === 'phase' ? '' : undefined}
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
      data-phase={e.kind === 'phase' ? '' : undefined}
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
