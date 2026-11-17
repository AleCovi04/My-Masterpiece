import { useMemo, useState } from 'react'
import FilterChips, { NoSeries } from '../../components/ui/FilterChips'
import type { Exercise, Id, IsoDate, Session, Settings } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { recordLabel, recordValue, setText } from '../../i18n/records'
import type { Range } from '../../lib/analysis'
import { parseIsoDate } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import { performedExercises } from '../../lib/strength'
import {
  exerciseHistory,
  exerciseRecords,
  REP_TARGETS,
  repMetric,
  type RecordMetric,
} from '../../lib/strengthRecords'
import LineChart from './LineChart'
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
}

type LoadKey = 'maxKg' | 'r4' | 'r6' | 'r8' | 'r10' | 'r12'
type VolKey = 'setVolume' | 'sessionVolume'

/** Serie dei carichi: peso massimo (= N 1) e una per ogni N, colori dal tema. */
const LOAD_COLORS: Record<LoadKey, string> = {
  maxKg: 'var(--accent)',
  r4: 'var(--brick)',
  r6: 'var(--swim)',
  r8: 'var(--bike)',
  r10: 'var(--run)',
  r12: 'var(--muted)',
}
const LOAD_KEYS = Object.keys(LOAD_COLORS) as LoadKey[]
const VOL_COLORS: Record<VolKey, string> = {
  setVolume: 'var(--swim)',
  sessionVolume: 'var(--strength)',
}
const VOL_KEYS = Object.keys(VOL_COLORS) as VolKey[]

/** Righe della tabella dei record (N = 1 coincide con il peso massimo). */
const TABLE_ROWS: RecordMetric[] = [
  'maxKg',
  ...REP_TARGETS.filter((n) => n > 1).map(repMetric),
  'setVolume',
  'sessionVolume',
]

/** Forza: record e progressione dell'esercizio scelto, mappa muscolare. */
export default function StrengthTab({
  allSessions,
  sessions,
  exercises,
  range,
  today,
  settings,
  onSettingsChange,
}: Props) {
  const { t, lang } = useI18n()
  const a = t.analysis
  const [picked, setPicked] = useState<Id | null>(null)
  const [loadsOn, setLoadsOn] = useState<LoadKey[]>(LOAD_KEYS)
  const [volOn, setVolOn] = useState<VolKey[]>(VOL_KEYS)

  const nameOf = (id: Id) =>
    exercises.find((e) => e.id === id)?.name ?? t.calendar.unknownExercise
  const short = (iso: IsoDate) => {
    const d = parseIsoDate(iso)
    return `${d.getDate()} ${t.monthsShort[d.getMonth()]}`
  }
  const num = (n: number, digits = 1) =>
    n.toLocaleString(lang, { maximumFractionDigits: digits })

  // esercizi di tutto lo storico; di default il più frequente nel periodo
  const performed = useMemo(
    () => performedExercises(allSessions),
    [allSessions],
  )
  const inPeriod = useMemo(() => performedExercises(sessions), [sessions])
  const current =
    picked && performed.includes(picked)
      ? picked
      : (inPeriod[0] ?? performed[0])

  const history = useMemo(
    () => (current ? exerciseHistory(allSessions, current) : []),
    [allSessions, current],
  )
  const records = useMemo(() => exerciseRecords(history), [history])
  const points = history.filter(
    (h) => h.date >= range.start && h.date <= range.end,
  )
  const ticks = points.map((p) => short(p.date))
  const titles = points.map(
    (p) =>
      `${formatLongDate(p.date, t.monthsShort)} · ${p.stats.count} ${t.sets}`,
  )

  const loadLabel = (k: LoadKey) =>
    k === 'maxKg' ? a.seriesMax : a.seriesReps.replace('{n}', k.slice(1))
  const volLabel = (k: VolKey) =>
    k === 'setVolume' ? a.seriesSetVolume : a.seriesSessionVolume
  const series = <K extends RecordMetric>(
    keys: K[],
    colors: Record<K, string>,
    label: (k: K) => string,
  ) =>
    keys.map((k) => ({
      key: k,
      label: label(k),
      color: colors[k],
      values: points.map((p) => p.stats.values[k]),
      marks: points.map((p) => p.records.includes(k)),
    }))
  const kgFormat = (v: number) => num(v, 1)
  const volFormat = (v: number) =>
    v >= 10000 ? `${num(v / 1000)}k` : String(Math.round(v))

  const rowLabel = (m: RecordMetric) =>
    m === 'maxKg'
      ? a.maxKgRow
      : m.startsWith('r')
        ? a.repsRow.replace('{n}', m.slice(1))
        : recordLabel(m, t)

  return (
    <div className="ana-grid">
      {current ? (
        <>
          <section className="panel">
            <h3>{a.records}</h3>
            <label className="ana-period">
              <span>{a.exercise}</span>
              <select
                className="pl-inp"
                value={current}
                onChange={(e) => setPicked(e.target.value)}
              >
                {performed.map((id) => (
                  <option key={id} value={id}>
                    {nameOf(id)}
                  </option>
                ))}
              </select>
            </label>
            <table className="ana-table ana-recs">
              <thead>
                <tr>
                  <th>{a.recordCol}</th>
                  <th>{a.valueCol}</th>
                  <th>{a.dateCol}</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((m) => {
                  const r = records[m]
                  return (
                    <tr key={m}>
                      <td>
                        {rowLabel(m)}
                        {m === 'maxKg' && (
                          <small className="ana-recs-note">
                            {a.maxKgRowNote}
                          </small>
                        )}
                      </td>
                      <td>
                        {r ? (
                          <>
                            <b>{recordValue(m, r.value, lang)}</b>
                            {r.set && <small>{setText(r.set, lang)}</small>}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{r ? formatLongDate(r.date, t.monthsShort) : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="note ana-legend">{a.recordsHow}</p>
          </section>

          <section className="panel">
            <h3>
              {a.loadsTitle} · {nameOf(current)}
            </h3>
            <FilterChips
              size="sm"
              label={a.loadsTitle}
              items={LOAD_KEYS.map((k) => ({
                key: k,
                label: loadLabel(k),
                color: LOAD_COLORS[k],
              }))}
              active={loadsOn}
              onChange={setLoadsOn}
            />
            {points.length === 0 ? (
              <p className="note">{a.noneInPeriod}</p>
            ) : loadsOn.length === 0 ? (
              <NoSeries />
            ) : (
              <LineChart
                label={`${a.loadsTitle} · ${nameOf(current)}`}
                ticks={ticks}
                titles={titles}
                series={series(loadsOn, LOAD_COLORS, loadLabel)}
                format={kgFormat}
                markLabel={a.newRecord}
              />
            )}
            <p className="note ana-legend">{a.loadsHow}</p>
          </section>

          <section className="panel">
            <h3>
              {a.volumeTitle} · {nameOf(current)}
            </h3>
            <FilterChips
              size="sm"
              label={a.volumeTitle}
              items={VOL_KEYS.map((k) => ({
                key: k,
                label: volLabel(k),
                color: VOL_COLORS[k],
              }))}
              active={volOn}
              onChange={setVolOn}
            />
            {points.length === 0 ? (
              <p className="note">{a.noneInPeriod}</p>
            ) : volOn.length === 0 ? (
              <NoSeries />
            ) : (
              <LineChart
                label={`${a.volumeTitle} · ${nameOf(current)}`}
                ticks={ticks}
                titles={titles}
                series={series(volOn, VOL_COLORS, volLabel)}
                format={volFormat}
                markLabel={a.newRecord}
              />
            )}
            <p className="note ana-legend">{a.volumeHowChart}</p>
          </section>
        </>
      ) : (
        <section className="panel">
          <h3>{a.records}</h3>
          <p className="note">{a.noStrengthEver}</p>
        </section>
      )}

      <MusclePanel
        allSessions={allSessions}
        sessions={sessions}
        exercises={exercises}
        range={range}
        today={today}
        settings={settings}
        onSettingsChange={onSettingsChange}
        onPickExercise={setPicked}
      />
    </div>
  )
}
