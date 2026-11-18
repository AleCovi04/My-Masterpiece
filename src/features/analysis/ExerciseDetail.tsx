import { useState } from 'react'
import FilterChips, { NoSeries } from '../../components/ui/FilterChips'
import type { IsoDate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { recordLabel, recordValue, setText } from '../../i18n/records'
import type { Range } from '../../lib/analysis'
import { parseIsoDate } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import {
  exerciseRecords,
  REP_TARGETS,
  repMetric,
  type ExerciseSession,
  type RecordMetric,
} from '../../lib/strengthRecords'
import LineChart from './LineChart'

interface Props {
  name: string
  /** Storico completo dell'esercizio. */
  history: ExerciseSession[]
  range: Range
  /** Torna alla lista (su telefono il dettaglio è a schermo intero). */
  onBack: () => void
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

/** Dettaglio di un esercizio: tabella dei record, grafici Carichi e Volume. */
export default function ExerciseDetail({
  name,
  history,
  range,
  onBack,
}: Props) {
  const { t, lang } = useI18n()
  const a = t.analysis
  const [loadsOn, setLoadsOn] = useState<LoadKey[]>(LOAD_KEYS)
  const [volOn, setVolOn] = useState<VolKey[]>(VOL_KEYS)

  const short = (iso: IsoDate) => {
    const d = parseIsoDate(iso)
    return `${d.getDate()} ${t.monthsShort[d.getMonth()]}`
  }
  const num = (n: number, digits = 1) =>
    n.toLocaleString(lang, { maximumFractionDigits: digits })

  const records = exerciseRecords(history)
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
    <div className="st-detail" role="region" aria-label={name}>
      <div className="st-detail-top">
        <button type="button" className="pl-btn st-back" onClick={onBack}>
          ← {a.back}
        </button>
        <h2 className="st-detail-name">{name}</h2>
      </div>

      <section className="panel">
        <h3>{a.records}</h3>
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
                      <small className="ana-recs-note">{a.maxKgRowNote}</small>
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
        <h3>{a.loadsTitle}</h3>
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
            label={`${a.loadsTitle} · ${name}`}
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
        <h3>{a.volumeTitle}</h3>
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
            label={`${a.volumeTitle} · ${name}`}
            ticks={ticks}
            titles={titles}
            series={series(volOn, VOL_COLORS, volLabel)}
            format={volFormat}
            markLabel={a.newRecord}
          />
        )}
        <p className="note ana-legend">{a.volumeHowChart}</p>
      </section>
    </div>
  )
}
