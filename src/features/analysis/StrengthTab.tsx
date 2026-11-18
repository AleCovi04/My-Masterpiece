import { useMemo, useState } from 'react'
import type { Exercise, Id, IsoDate, Session, Settings } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { recordLabel, recordValue } from '../../i18n/records'
import type { Range } from '../../lib/analysis'
import { parseIsoDate } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import {
  allHistories,
  exerciseSummary,
  latestRecords,
  type ExerciseSummary,
  type RecordMetric,
} from '../../lib/strengthRecords'
import ExerciseDetail from './ExerciseDetail'
import ExercisePicker from './ExercisePicker'
import type { StrengthUi } from './strengthUi'
import MusclePanel from './MusclePanel'

interface Props {
  /** Tutte le sedute: record e recupero tengono conto di tutto lo storico. */
  allSessions: Session[]
  /** Le sedute del periodo. */
  sessions: Session[]
  exercises: Exercise[]
  range: Range
  today: IsoDate
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  ui: StrengthUi
  onUi: (ui: StrengthUi) => void
}

/** Forza: mappa muscolare, ultimi record e dettaglio dell'esercizio scelto. */
export default function StrengthTab({
  allSessions,
  sessions,
  exercises,
  range,
  today,
  settings,
  onSettingsChange,
  ui,
  onUi,
}: Props) {
  const { t, lang } = useI18n()
  const a = t.analysis
  const [picking, setPicking] = useState(false)

  const histories = useMemo(() => allHistories(allSessions), [allSessions])
  const summaries = useMemo(() => {
    const out = new Map<Id, ExerciseSummary>()
    for (const [id, h] of histories) {
      const s = exerciseSummary(h)
      if (s) out.set(id, s)
    }
    return out
  }, [histories])
  const latest = useMemo(() => latestRecords(histories), [histories])

  const nameOf = (id: Id) =>
    exercises.find((e) => e.id === id)?.name ?? t.calendar.unknownExercise
  const short = (iso: IsoDate) => {
    const d = parseIsoDate(iso)
    return `${d.getDate()} ${t.monthsShort[d.getMonth()]}`
  }
  const metricText = (m: RecordMetric) =>
    m === 'maxKg'
      ? a.seriesMax
      : m.startsWith('r')
        ? a.seriesReps.replace('{n}', m.slice(1))
        : recordLabel(m, t)

  const select = (id: Id) => {
    onUi({ ...ui, selected: id })
    setPicking(false)
  }
  // di default l'ultimo esercizio fatto
  const lastDone = [...summaries.entries()].reduce<[Id, string] | null>(
    (best, [id, s]) =>
      !best || s.lastDate > best[1] ? [id, s.lastDate] : best,
    null,
  )?.[0]
  const selected =
    ui.selected && exercises.some((e) => e.id === ui.selected)
      ? ui.selected
      : (lastDone ?? null)
  const summary = selected ? summaries.get(selected) : undefined
  const meta = summary
    ? a.lastTimeOn.replace(
        '{date}',
        formatLongDate(summary.lastDate, t.monthsShort),
      )
    : a.neverDone

  return (
    <div className="ana-grid">
      <MusclePanel
        allSessions={allSessions}
        sessions={sessions}
        exercises={exercises}
        range={range}
        today={today}
        settings={settings}
        onSettingsChange={onSettingsChange}
        muscle={ui.muscles.length === 1 ? ui.muscles[0] : null}
        onMuscleChange={(m) => onUi({ ...ui, muscles: m ? [m] : [] })}
        onPickExercise={(id) => select(id)}
      />

      <section className="panel st-latest">
        <h3>{a.latestRecords}</h3>
        {latest.length === 0 ? (
          <p className="note">{a.noRecordsYet}</p>
        ) : (
          <ul className="st-strip">
            {latest.map((r) => (
              <li key={`${r.sessionId}-${r.exerciseId}`}>
                <button
                  type="button"
                  className="st-rec"
                  onClick={() => select(r.exerciseId)}
                >
                  <b>{nameOf(r.exerciseId)}</b>
                  <span>
                    {metricText(r.metric)} ·{' '}
                    <strong>{recordValue(r.metric, r.value, lang)}</strong>
                    {r.others > 0 && (
                      <small className="st-more">
                        {' '}
                        {a.moreRecords.replace('{n}', String(r.others))}
                      </small>
                    )}
                  </span>
                  <small>{short(r.date)}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected ? (
        <ExerciseDetail
          name={nameOf(selected)}
          meta={meta}
          history={histories.get(selected) ?? []}
          range={range}
          onPick={() => setPicking(true)}
        />
      ) : (
        <section className="panel">
          <h3>{a.records}</h3>
          <p className="note">{a.noStrengthEver}</p>
          <button
            type="button"
            className="pl-btn acc st-pick"
            onClick={() => setPicking(true)}
          >
            {a.pickExerciseTitle}
          </button>
        </section>
      )}

      {picking && (
        <ExercisePicker
          exercises={exercises}
          summaries={summaries}
          today={today}
          filters={ui}
          onFilters={(f) => onUi({ ...ui, ...f })}
          selected={selected}
          onSelect={select}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}
