import { useMemo, useState } from 'react'
import { BodyMap, groupName, type BodyGroup } from '../../components/body'
import type { Exercise, Id, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { parseIsoDate } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import {
  exerciseProgress,
  muscleExercises,
  muscleSetsIn,
  performedExercises,
} from '../../lib/strength'
import BarChart from './BarChart'
import LineChart from './LineChart'

interface Props {
  /** Le sedute del periodo. */
  sessions: Session[]
  exercises: Exercise[]
}

/** Forza: mappa muscolare delle serie e progressione per esercizio. */
export default function StrengthTab({ sessions, exercises }: Props) {
  const { t, lang } = useI18n()
  const a = t.analysis
  const [muscle, setMuscle] = useState<BodyGroup | null>(null)
  const [picked, setPicked] = useState<Id | null>(null)

  const num = (n: number, digits = 1) =>
    n.toLocaleString(lang, { maximumFractionDigits: digits })
  const nameOf = (id: Id) =>
    exercises.find((e) => e.id === id)?.name ?? t.calendar.unknownExercise

  const perMuscle = useMemo(
    () => muscleSetsIn(sessions, exercises),
    [sessions, exercises],
  )
  const hasSets = Object.values(perMuscle).some((v) => v > 0)
  const list = useMemo(
    () => (muscle ? muscleExercises(sessions, exercises, muscle) : []),
    [sessions, exercises, muscle],
  )

  const performed = useMemo(() => performedExercises(sessions), [sessions])
  const current = picked && performed.includes(picked) ? picked : performed[0]
  const progress = useMemo(
    () => (current ? exerciseProgress(sessions, current) : []),
    [sessions, current],
  )
  const ticks = progress.map((p) => {
    const d = parseIsoDate(p.date)
    return `${d.getDate()} ${t.monthsShort[d.getMonth()]}`
  })
  const best1Rm = Math.max(0, ...progress.map((p) => p.best1Rm))
  const maxKg = Math.max(0, ...progress.map((p) => p.maxKg))
  const volume = progress.reduce((s, p) => s + p.volume, 0)

  return (
    <div className="ana-grid">
      <section className="panel">
        <h3>{a.muscleMap}</h3>
        {hasSets ? (
          <>
            <BodyMap
              mode="heat"
              values={perMuscle}
              formatValue={(v) => `${num(v)} ${t.sets}`}
              selected={muscle}
              onSelect={setMuscle}
            />
            <p className="note ana-legend">{a.muscleHow}</p>
            {muscle && (
              <div className="ana-muscle">
                <h4>
                  {groupName(muscle, lang)} · {num(perMuscle[muscle])} {t.sets}
                </h4>
                {list.length === 0 ? (
                  <p className="note">{a.noMuscleExercises}</p>
                ) : (
                  <table className="ana-table">
                    <thead>
                      <tr>
                        <th>{a.exercise}</th>
                        <th>{a.setsDone}</th>
                        <th>{a.maxKg}</th>
                        <th>{a.e1rm}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => (
                        <tr key={r.exerciseId}>
                          <td>
                            <button
                              type="button"
                              className="ana-link"
                              onClick={() => setPicked(r.exerciseId)}
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
                          <td>{num(r.best1Rm)} kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="note">{a.noStrength}</p>
        )}
      </section>

      <section className="panel">
        <h3>{a.progress}</h3>
        {current ? (
          <>
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
            <dl className="ana-figs">
              <div>
                <dt>
                  <i
                    className="ana-key"
                    style={{ background: 'var(--accent)' }}
                  />
                  {a.e1rm}
                </dt>
                <dd>{num(best1Rm)}</dd>
              </div>
              <div>
                <dt>
                  <i
                    className="ana-key"
                    style={{ background: 'var(--muted)' }}
                  />
                  {a.maxKg}
                </dt>
                <dd>{num(maxKg, 2)}</dd>
              </div>
              <div>
                <dt>{a.volume}</dt>
                <dd>{num(volume, 0)}</dd>
              </div>
            </dl>
            <LineChart
              label={`${a.progress} · ${nameOf(current)}`}
              ticks={ticks}
              series={[
                {
                  key: 'e1rm',
                  label: a.e1rm,
                  color: 'var(--accent)',
                  values: progress.map((p) => p.best1Rm),
                },
                {
                  key: 'max',
                  label: a.maxKg,
                  color: 'var(--muted)',
                  values: progress.map((p) => p.maxKg),
                  dashed: true,
                },
              ]}
              format={(v) => `${Math.round(v)}`}
            />
            <h4 className="ana-sub">{a.volumePerSession}</h4>
            <BarChart
              label={a.volumePerSession}
              ticks={ticks}
              titles={progress.map(
                (p) =>
                  `${formatLongDate(p.date, t.monthsShort)} · ${p.sets} ${t.sets}`,
              )}
              stacks={[
                {
                  key: 'vol',
                  color: 'var(--strength)',
                  values: progress.map((p) => p.volume),
                },
              ]}
              format={(v) =>
                v >= 1000 ? `${num(v / 1000)}k` : String(Math.round(v))
              }
            />
            <p className="note ana-legend">{a.progressHow}</p>
          </>
        ) : (
          <p className="note">{a.noStrength}</p>
        )}
      </section>
    </div>
  )
}
