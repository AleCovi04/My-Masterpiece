import { lazy, Suspense, useMemo, useState } from 'react'
import type { EnduranceDiscipline, Thresholds } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatClock } from '../../lib/enduranceTemplate'
import {
  hasField,
  movingTime,
  normalizedPower,
  series,
  splitLength,
  splits,
  type SeriesField,
} from '../../lib/fit/analysis'
import type { FitActivity, FitSession } from '../../lib/fit/types'
import ActivityChart from './ActivityChart'
import { avgSpeed, axisText, distText, speedText } from './format'
import { type StatItem, StatGrid } from './ActivityStats'
import { SplitTable, Lengths } from './ActivityLaps'
import { Zones } from './ActivityZones'
import { BestEfforts } from './BestEfforts'

// mappa caricata solo quando serve
const ActivityMap = lazy(() => import('./ActivityMap'))

const CHART_FIELDS: Record<EnduranceDiscipline, SeriesField[]> = {
  run: ['pace', 'hr', 'alt', 'cad', 'pw', 'temp'],
  bike: ['speed', 'hr', 'alt', 'cad', 'pw', 'temp'],
  swim: ['pace', 'hr', 'cad', 'temp'],
}

/** Una frazione con il file FIT: tutto quello che c'è. */
export function LegDetail({
  act,
  s,
  thresholds,
}: {
  act: FitActivity
  s: FitSession
  thresholds: Thresholds
}) {
  const { t } = useI18n()
  const g = t.garmin
  const d = s.discipline
  const pts = useMemo(
    () => act.points.slice(s.pointStart, s.pointEnd),
    [act, s],
  )
  const [hover, setHover] = useState<number | null>(null)
  const hasDist = pts.some((p) => p.d !== undefined)
  const [axis, setAxis] = useState<'time' | 'distance'>(
    hasDist ? 'distance' : 'time',
  )
  const hasTrack = pts.filter((p) => p.lat !== undefined).length > 1
  const pool = d === 'swim' && s.lengths.length > 0 && !hasTrack

  const cadUnit =
    d === 'run' ? g.unitSpmRun : d === 'bike' ? g.unitRpm : g.unitSpmSwim
  const speed = s.avgSpeed ?? avgSpeed(s.distanceM, s.timerS)
  const np = s.normPowerW ?? normalizedPower(pts)
  const moving = s.movingS ?? (pts.length > 1 ? movingTime(pts) : undefined)
  const stats: (StatItem | false | undefined)[] = [
    s.distanceM !== undefined && {
      label: g.distance,
      value: distText(s.distanceM, d),
    },
    moving !== undefined && { label: g.movingTime, value: formatClock(moving) },
    { label: g.elapsedTime, value: formatClock(s.elapsedS) },
    speed !== undefined && {
      label: d === 'bike' ? g.avgSpeed : g.pace,
      value: speedText(speed, d),
    },
    s.maxSpeed !== undefined &&
      d === 'bike' && {
        label: g.maxSpeed,
        value: speedText(s.maxSpeed, d),
      },
    s.ascentM !== undefined &&
      d !== 'swim' && {
        label: g.elevGain,
        value: `${Math.round(s.ascentM)} m`,
      },
    s.descentM !== undefined &&
      d !== 'swim' && {
        label: g.elevLoss,
        value: `${Math.round(s.descentM)} m`,
      },
    s.avgHr !== undefined && {
      label: g.avgHr,
      value: `${Math.round(s.avgHr)} bpm`,
    },
    s.maxHr !== undefined && {
      label: g.maxHr,
      value: `${Math.round(s.maxHr)} bpm`,
    },
    s.avgCadence !== undefined && {
      label: g.cadence,
      value: `${s.avgCadence} ${cadUnit}`,
    },
    s.maxCadence !== undefined && {
      label: g.maxCadence,
      value: `${s.maxCadence} ${cadUnit}`,
    },
    s.avgPowerW !== undefined && {
      label: g.avgPower,
      value: `${Math.round(s.avgPowerW)} W`,
    },
    np !== undefined && { label: g.normPower, value: `${np} W` },
    s.maxPowerW !== undefined && {
      label: g.maxPower,
      value: `${Math.round(s.maxPowerW)} W`,
    },
    s.calories !== undefined && {
      label: g.calories,
      value: `${Math.round(s.calories)} kcal`,
    },
    s.avgTempC !== undefined && {
      label: g.temperature,
      value: `${Math.round(s.avgTempC)} °C`,
    },
    s.trainingEffect !== undefined && {
      label: g.trainingEffect,
      value: s.trainingEffect.toFixed(1),
    },
    s.poolLengthM !== undefined && {
      label: g.pool,
      value: `${Math.round(s.poolLengthM)} m`,
    },
    pool && {
      label: g.lengths,
      value: String(s.lengths.filter((l) => l.active).length),
    },
    s.totalStrokes !== undefined && {
      label: g.strokes,
      value: String(s.totalStrokes),
    },
    s.avgSwolf !== undefined && { label: g.swolf, value: String(s.avgSwolf) },
  ]

  const fields = CHART_FIELDS[d].filter((f) => hasField(pts, f))
  const fmt = (f: SeriesField) => (v: number) => {
    switch (f) {
      case 'pace':
        return formatClock(Math.round(d === 'swim' ? v / 10 : v))
      case 'speed':
        return v.toFixed(1)
      default:
        return String(Math.round(v))
    }
  }
  const unit: Record<SeriesField, string> = {
    pace: d === 'swim' ? '/100 m' : '/km',
    speed: 'km/h',
    hr: 'bpm',
    alt: 'm',
    cad: cadUnit,
    pw: 'W',
    temp: '°C',
  }

  const splitList = !pool && hasDist ? splits(pts, splitLength(d)) : []

  return (
    <>
      {hasTrack && (
        <Suspense fallback={<div className="am" />}>
          <ActivityMap
            points={pts}
            offset={s.pointStart}
            hover={hover}
            attribution={g.mapAttribution}
          />
        </Suspense>
      )}

      <StatGrid items={stats} />

      {fields.length > 0 && (
        <section className="gm-sec">
          <div className="gm-sec-h">
            <h2>{g.charts}</h2>
            {hasDist && (
              <div className="seg" role="group" aria-label={g.charts}>
                {(['distance', 'time'] as const).map((x) => (
                  <button
                    type="button"
                    key={x}
                    aria-pressed={axis === x}
                    onClick={() => setAxis(x)}
                  >
                    {x === 'time' ? g.axisTime : g.axisDistance}
                  </button>
                ))}
              </div>
            )}
          </div>
          {fields.map((f) => (
            <ActivityChart
              key={`${f}-${axis}`}
              label={`${g.series[f]} (${unit[f]})`}
              points={series(pts, f, axis, 600, s.pointStart)}
              format={fmt(f)}
              formatX={(x) => axisText(x, axis, d)}
              invert={f === 'pace'}
              fullRange={f === 'alt'}
              hover={hover}
              onHover={setHover}
            />
          ))}
        </section>
      )}

      {splitList.length > 1 && (
        <section className="gm-sec">
          <h2>{g.splits}</h2>
          <SplitTable
            d={d}
            rows={splitList.map((x) => ({
              n: x.n,
              distanceM: x.distanceM,
              durationS: x.durationS,
              avgHr: x.avgHr,
              avgPowerW: x.avgPowerW,
              elevationM: x.elevationM,
            }))}
          />
        </section>
      )}

      {s.laps.length > 1 && (
        <section className="gm-sec">
          <h2>{g.laps}</h2>
          <SplitTable
            d={d}
            rows={s.laps.map((l, i) => ({
              n: i + 1,
              distanceM: l.distanceM ?? 0,
              durationS: l.durationS,
              avgHr: l.avgHr,
              avgPowerW: l.avgPowerW,
              elevationM: l.elevationGainM,
              cadence: l.avgCadence,
            }))}
          />
        </section>
      )}

      {pool && <Lengths s={s} />}

      <Zones pts={pts} s={s} thresholds={thresholds} />
      <BestEfforts pts={pts} d={d} />
    </>
  )
}
