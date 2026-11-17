import { useMemo, useState } from 'react'
import type { EnduranceDiscipline, Session, Sport } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  distanceSeries,
  ENDURANCE,
  sumDistance,
  sumTime,
  timeSeries,
  type Bucket,
} from '../../lib/analysis'
import { formatDistance, formatDuration } from '../../lib/format'
import { DISCIPLINES } from '../../lib/weekStats'
import BarChart, { PlannedKey } from './BarChart'

interface Props {
  sessions: Session[]
  buckets: Bucket[]
  ticks: string[]
  titles: string[]
}

const hoursLabel = (h: number) => `${+h.toFixed(2)}h`

/** Volumi: ore per disciplina e distanza per sport, eseguito contro pianificato. */
export default function VolumeTab({ sessions, buckets, ticks, titles }: Props) {
  const { t } = useI18n()
  const a = t.analysis
  const [shown, setShown] = useState<Sport[]>(DISCIPLINES)
  const [sport, setSport] = useState<EnduranceDiscipline>('run')

  const time = useMemo(() => timeSeries(sessions, buckets), [sessions, buckets])
  const dist = useMemo(
    () => distanceSeries(sessions, buckets),
    [sessions, buckets],
  )
  const timeTot = sumTime(time)
  const distTot = sumDistance(dist)

  const toggle = (d: Sport) =>
    setShown((cur) =>
      cur.includes(d)
        ? cur.length > 1
          ? cur.filter((x) => x !== d)
          : cur
        : DISCIPLINES.filter((x) => x === d || cur.includes(x)),
    )

  const actualS = shown.reduce((s, d) => s + timeTot[d].actualS, 0)
  const plannedS = shown.reduce((s, d) => s + timeTot[d].plannedS, 0)
  // il nuoto si legge in metri, gli altri sport in km
  const unit = sport === 'swim' ? 1 : 1000
  const distLabel = (v: number) =>
    sport === 'swim' ? `${Math.round(v)}` : `${+v.toFixed(1)}`

  return (
    <div className="ana-grid">
      <section className="panel">
        <h3>{a.hours}</h3>
        <div className="chips sm">
          {DISCIPLINES.map((d) => (
            <button
              type="button"
              key={d}
              className="chip"
              data-discipline={d}
              aria-pressed={shown.includes(d)}
              onClick={() => toggle(d)}
            >
              <i />
              {t.discipline[d]}
            </button>
          ))}
        </div>
        <p className="sub">
          {a.actual} <b>{formatDuration(actualS)}</b> · {a.planned}{' '}
          {formatDuration(plannedS)}
        </p>
        <BarChart
          label={a.hours}
          ticks={ticks}
          titles={titles}
          stacks={shown.map((d) => ({
            key: d,
            label: t.discipline[d],
            color: `var(--${d})`,
            values: time.map((x) => x[d].actualS / 3600),
          }))}
          planned={time.map(
            (x) => shown.reduce((s, d) => s + x[d].plannedS, 0) / 3600,
          )}
          plannedLabel={a.plannedOne}
          totalLabel={a.total}
          format={hoursLabel}
          formatTip={(h) => formatDuration(Math.round(h * 3600))}
        />
        <p className="note ana-legend">
          {a.legendBars} · <PlannedKey /> {a.legendDash}
        </p>
      </section>

      <section className="panel">
        <h3>{a.distance}</h3>
        <div className="chips sm">
          {ENDURANCE.map((d) => (
            <button
              type="button"
              key={d}
              className="chip"
              data-discipline={d}
              aria-pressed={sport === d}
              onClick={() => setSport(d)}
            >
              <i />
              {t.discipline[d]}
            </button>
          ))}
        </div>
        <p className="sub">
          {a.actualDist} <b>{formatDistance(distTot[sport].actualM, sport)}</b>{' '}
          · {a.plannedDist} {formatDistance(distTot[sport].plannedM, sport)}
        </p>
        <BarChart
          label={`${a.distance} · ${t.discipline[sport]}`}
          ticks={ticks}
          titles={titles}
          stacks={[
            {
              key: sport,
              label: t.discipline[sport],
              color: `var(--${sport})`,
              values: dist.map((x) => x[sport].actualM / unit),
            },
          ]}
          planned={dist.map((x) => x[sport].plannedM / unit)}
          plannedLabel={a.plannedOne}
          format={distLabel}
          formatTip={(v) => formatDistance(v * unit, sport)}
        />
        <p className="note ana-legend">
          {a.legendBars} · <PlannedKey /> {a.legendDash} ·{' '}
          {sport === 'swim' ? 'm' : 'km'}
        </p>
      </section>
    </div>
  )
}
