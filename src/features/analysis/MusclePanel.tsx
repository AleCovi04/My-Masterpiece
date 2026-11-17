import { useMemo, useState } from 'react'
import { BodyMap, groupName, type BodyGroup } from '../../components/body'
import {
  MUSCLES,
  type Exercise,
  type Id,
  type IsoDate,
  type MuscleId,
  type Session,
  type Settings,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import type { Range } from '../../lib/analysis'
import { formatLongDate } from '../../lib/format'
import {
  fatigueLevel,
  lastTrained,
  muscleFatigue,
} from '../../lib/muscleRecovery'
import {
  rangeFor,
  volumeZone,
  weeklyMuscleSets,
  weeksIn,
  type VolumeZone,
} from '../../lib/muscleVolume'
import { muscleExercises } from '../../lib/strength'
import RangeEditor from './RangeEditor'

type Mode = 'recovery' | 'volume'

interface Props {
  allSessions: Session[]
  sessions: Session[]
  exercises: Exercise[]
  range: Range
  today: IsoDate
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  /** Tocco su un esercizio del dettaglio: lo si sceglie per record e grafici. */
  onPickExercise: (id: Id) => void
}

/** Colori delle zone di volume, dalle variabili del tema. */
const ZONE_COLOR: Record<VolumeZone, string> = {
  below: 'color-mix(in srgb, var(--warn) 60%, var(--bm-muscle))',
  in: 'var(--ok)',
  above: 'var(--miss)',
}
const ZONES: VolumeZone[] = ['below', 'in', 'above']

/** Rosso pieno = affaticato, colore del muscolo = recuperato. */
const fatigueColor = (level: number) =>
  level > 0
    ? `color-mix(in srgb, var(--heat-hi) ${(15 + 85 * level).toFixed(1)}%, var(--bm-muscle))`
    : undefined

/** Mappa muscolare con Recupero (oggi) o Volume (periodo), lista ordinata e dettaglio. */
export default function MusclePanel({
  allSessions,
  sessions,
  exercises,
  range,
  today,
  settings,
  onSettingsChange,
  onPickExercise,
}: Props) {
  const { t, lang } = useI18n()
  const a = t.analysis
  const [mode, setMode] = useState<Mode>('recovery')
  const [muscle, setMuscle] = useState<BodyGroup | null>(null)
  // "adesso" fisso finché la scheda resta aperta
  const [nowMs] = useState(() => Date.now())

  const num = (n: number, digits = 1) =>
    n.toLocaleString(lang, { maximumFractionDigits: digits })
  const nameOf = (id: Id) =>
    exercises.find((e) => e.id === id)?.name ?? t.calendar.unknownExercise

  const fatigue = useMemo(
    () => muscleFatigue(allSessions, exercises, nowMs),
    [allSessions, exercises, nowMs],
  )
  const weeks = weeksIn(range, today)
  const weekly = useMemo(
    () => weeklyMuscleSets(sessions, exercises, weeks),
    [sessions, exercises, weeks],
  )

  const level = (m: MuscleId) => fatigueLevel(fatigue[m])
  const zoneOf = (m: MuscleId) => volumeZone(weekly[m], rangeFor(settings, m))

  const colors = Object.fromEntries(
    MUSCLES.map((m) => [
      m.id,
      mode === 'recovery'
        ? fatigueColor(level(m.id))
        : ZONE_COLOR[zoneOf(m.id)],
    ]),
  ) as Partial<Record<MuscleId, string>>

  const pct = (m: MuscleId) => Math.round(level(m) * 100)
  const valueText = (m: MuscleId) =>
    mode === 'recovery'
      ? pct(m) > 0
        ? a.fatigue.replace('{v}', `${pct(m)}%`)
        : a.recovered
      : `${num(weekly[m])} ${a.perWeek}`

  // lista: dal più affaticato, o dal volume più alto
  const rows = [...MUSCLES]
    .map((m) => m.id)
    .sort((x, y) =>
      mode === 'recovery' ? fatigue[y] - fatigue[x] : weekly[y] - weekly[x],
    )
  const volTop = Math.max(
    1,
    ...rows.map((m) => weekly[m]),
    ...rows.map((m) => rangeFor(settings, m).max),
  )
  const barWidth = (m: MuscleId) =>
    mode === 'recovery' ? level(m) * 100 : (100 * weekly[m]) / volTop

  const last = useMemo(
    () =>
      mode === 'recovery' && muscle
        ? lastTrained(allSessions, exercises, muscle, nowMs)
        : null,
    [mode, muscle, allSessions, exercises, nowMs],
  )
  const periodList = useMemo(
    () =>
      mode === 'volume' && muscle
        ? muscleExercises(sessions, exercises, muscle)
        : [],
    [mode, muscle, sessions, exercises],
  )

  const legend =
    mode === 'recovery' ? (
      <div className="bm-legend" aria-label={a.mapRecovery}>
        <span>{a.fatigued}</span>
        <i className="ana-fatigue-scale" />
        <span>{a.recovered}</span>
      </div>
    ) : (
      <div className="ana-zones" aria-label={a.mapVolume}>
        {ZONES.map((z) => (
          <span key={z}>
            <i style={{ background: ZONE_COLOR[z] }} />
            {a.zone[z]}
          </span>
        ))}
      </div>
    )

  return (
    <section className="panel">
      <div className="ld-head">
        <h3>{a.muscleMap}</h3>
        <div className="seg" role="group" aria-label={a.mapMode}>
          {(['recovery', 'volume'] as const).map((m) => (
            <button
              type="button"
              key={m}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {m === 'recovery' ? a.mapRecovery : a.mapVolume}
            </button>
          ))}
        </div>
      </div>

      <div className="ana-map">
        <BodyMap
          mode="heat"
          values={mode === 'recovery' ? fatigue : weekly}
          colors={colors}
          legend={legend}
          formatValue={(v) =>
            mode === 'recovery'
              ? fatigueLevel(v) > 0
                ? a.fatigue.replace(
                    '{v}',
                    `${Math.round(fatigueLevel(v) * 100)}%`,
                  )
                : a.recovered
              : `${num(v)} ${a.perWeek}`
          }
          selected={muscle}
          onSelect={setMuscle}
        />
        <ol className="ana-mlist" aria-label={a.muscleMap}>
          {rows.map((m) => (
            <li key={m}>
              <button
                type="button"
                className={`ana-mrow${muscle === m ? ' sel' : ''}`}
                aria-pressed={muscle === m}
                onClick={() => setMuscle(muscle === m ? null : m)}
              >
                <span className="ana-mname">{groupName(m, lang)}</span>
                <span className="ana-mtrack" aria-hidden="true">
                  <i
                    style={{
                      width: `${Math.min(100, barWidth(m))}%`,
                      background:
                        mode === 'recovery'
                          ? (fatigueColor(level(m)) ?? 'transparent')
                          : ZONE_COLOR[zoneOf(m)],
                    }}
                  />
                </span>
                <span className="ana-mval">
                  {mode === 'recovery'
                    ? pct(m) > 0
                      ? `${pct(m)}%`
                      : '—'
                    : num(weekly[m])}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {muscle && (
        <div className="ana-muscle">
          <h4>
            {groupName(muscle, lang)} · {valueText(muscle)}
          </h4>
          {mode === 'recovery' ? (
            last ? (
              <>
                <p className="note">
                  {a.lastTrained.replace(
                    '{date}',
                    formatLongDate(last.date, t.monthsShort),
                  )}
                </p>
                <ul className="ana-exlist">
                  {last.exercises.map((e) => (
                    <li key={e.exerciseId}>
                      <button
                        type="button"
                        className="ana-link"
                        onClick={() => onPickExercise(e.exerciseId)}
                      >
                        {nameOf(e.exerciseId)}
                      </button>
                      <span>
                        {e.sets} {t.sets}
                        {e.weighted !== e.sets && (
                          <small> ({num(e.weighted)})</small>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="note">{a.neverTrained}</p>
            )
          ) : (
            <>
              <p className="note">
                {a.zone[zoneOf(muscle)]} ·{' '}
                {a.range
                  .replace('{min}', num(rangeFor(settings, muscle).min))
                  .replace('{max}', num(rangeFor(settings, muscle).max))}
              </p>
              {periodList.length === 0 ? (
                <p className="note">{a.noMuscleExercises}</p>
              ) : (
                <table className="ana-table">
                  <thead>
                    <tr>
                      <th>{a.exercise}</th>
                      <th>{a.setsDone}</th>
                      <th>{a.maxKg}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodList.map((r) => (
                      <tr key={r.exerciseId}>
                        <td>
                          <button
                            type="button"
                            className="ana-link"
                            onClick={() => onPickExercise(r.exerciseId)}
                          >
                            {nameOf(r.exerciseId)}
                          </button>
                        </td>
                        <td>
                          {r.sets}
                          {r.weighted !== r.sets && (
                            <small> ({num(r.weighted)})</small>
                          )}
                        </td>
                        <td>{num(r.maxKg, 2)} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      {mode === 'volume' && (
        <RangeEditor
          settings={settings}
          muscle={muscle}
          onChange={onSettingsChange}
        />
      )}

      <p className="note ana-legend">
        {mode === 'recovery'
          ? a.recoveryHow
          : a.volumeHow.replace('{w}', num(weeks))}
      </p>
      <p className="note ld-disclaimer">{a.estimates}</p>
    </section>
  )
}
