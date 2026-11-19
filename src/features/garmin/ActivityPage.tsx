import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DisciplineIcon } from '../../components/ui/Icons'
import { account, dataStore, useDataRevision } from '../../data'
import type {
  BrickSession,
  EnduranceDiscipline,
  EnduranceMetrics,
  EnduranceSession,
  Session,
  Thresholds,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatClock } from '../../lib/enduranceTemplate'
import {
  bestPowerEfforts,
  bestRunEfforts,
  hasField,
  hrZoneBounds,
  movingTime,
  normalizedPower,
  powerZoneBounds,
  series,
  splitLength,
  splits,
  timeInZones,
  type SeriesField,
} from '../../lib/fit/analysis'
import { readFit } from '../../lib/fit/decode'
import type { FitActivity, FitPoint, FitSession } from '../../lib/fit/types'
import { fullDateLabel } from '../calendar/period'
import '../calendar/calendar.css'
import '../planner/planner.css'
import ActivityChart from './ActivityChart'
import { avgSpeed, axisText, distText, speedText } from './format'
import './garmin.css'

const ActivityMap = lazy(() => import('./ActivityMap'))

type Fit =
  | { status: 'loading' }
  | { status: 'ok'; act: FitActivity }
  | { status: 'missing' }
  | { status: 'error' }

type Endurance = EnduranceSession | BrickSession

const isEndurance = (s: Session): s is Endurance => s.discipline !== 'strength'

/** Pagina di un'attività importata da Garmin: mappa, metriche, grafici, parziali, zone. */
export default function ActivityPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const g = t.garmin
  const navigate = useNavigate()
  const revision = useDataRevision()
  const [session, setSession] = useState<Endurance | null | undefined>()
  const [thresholds, setThresholds] = useState<Thresholds>({})
  // esito per attività: un'altra attività (o nessun esito) = in caricamento
  const [loaded, setLoaded] = useState<{ id: string; fit: Fit } | null>(null)
  const [leg, setLeg] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([dataStore.loadSessions(), dataStore.loadSettings()]).then(
      ([sessions, settings]) => {
        if (cancelled) return
        const s = sessions.find((x) => x.id === id)
        setSession(s && isEndurance(s) ? s : null)
        setThresholds(settings.thresholds)
      },
    )
    return () => {
      cancelled = true
    }
  }, [id, revision])

  const activityId = session?.actual?.garmin?.activityId
  useEffect(() => {
    if (!activityId) return
    let cancelled = false
    account
      .getFitFile(activityId)
      .then(async (bytes) => {
        if (!bytes) return { status: 'missing' } as const
        const act = await readFit(bytes)
        return act
          ? ({ status: 'ok', act } as const)
          : ({ status: 'error' } as const)
      })
      .catch(() => ({ status: 'error' }) as const)
      .then((next) => {
        if (!cancelled) setLoaded({ id: activityId, fit: next })
      })
    return () => {
      cancelled = true
    }
  }, [activityId])

  const fit: Fit =
    loaded && loaded.id === activityId ? loaded.fit : { status: 'loading' }

  if (session === undefined) return null
  const back = (
    <button type="button" className="pl-btn" onClick={() => navigate(-1)}>
      ‹ {g.back}
    </button>
  )
  if (!session || !session.actual) {
    return (
      <div className="gm-page">
        {back}
        <p className="ph">{g.notFound}</p>
      </div>
    )
  }

  const a = session.actual
  const act = fit.status === 'ok' ? fit.act : null
  const legs: { discipline: EnduranceDiscipline; metrics: EnduranceMetrics }[] =
    a.discipline === 'brick'
      ? a.legs.map((l) => ({ discipline: l.discipline, metrics: l }))
      : [{ discipline: a.discipline, metrics: a }]
  const legIndex = Math.min(leg, legs.length - 1)
  const fs = act?.sessions[legIndex]
  const d = legs[legIndex].discipline
  const startedAt = a.garmin?.startedAt
  const time = startedAt
    ? new Date(startedAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''
  const sub = fs?.subSport
    ? (g.subSport as Record<string, string>)[fs.subSport]
    : undefined

  return (
    <div className="gm-page" data-discipline={d}>
      {back}
      <header className="gm-head">
        <span className="wk-ic">
          <DisciplineIcon discipline={session.discipline} />
        </span>
        <div>
          <h1>{session.name ?? t.discipline[session.discipline]}</h1>
          <p>
            {fullDateLabel(session.date, t)}
            {time && ` · ${time}`}
            {sub && ` · ${sub}`}
          </p>
        </div>
      </header>

      {legs.length > 1 && (
        <div className="seg gm-legs" role="group" aria-label={g.leg}>
          {legs.map((l, i) => (
            <button
              type="button"
              key={i}
              aria-pressed={i === legIndex}
              onClick={() => setLeg(i)}
            >
              {i + 1} · {t.discipline[l.discipline]}
            </button>
          ))}
        </div>
      )}

      {fit.status === 'loading' && <p className="gm-hint">{g.loading}</p>}
      {fit.status === 'missing' && <p className="gm-note">{g.noFile}</p>}
      {fit.status === 'error' && <p className="gm-note">{g.readError}</p>}

      {act && fs ? (
        <LegDetail key={legIndex} act={act} s={fs} thresholds={thresholds} />
      ) : (
        <Stats d={d} m={legs[legIndex].metrics} />
      )}

      {(a.rpe !== undefined || a.notes) && (
        <section className="gm-sec">
          <dl className="gm-stats">
            {a.rpe !== undefined && (
              <div>
                <dt>{g.rpe}</dt>
                <dd>{a.rpe}/10</dd>
              </div>
            )}
            {a.notes && (
              <div className="gm-wide">
                <dt>{g.notes}</dt>
                <dd>{a.notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </div>
  )
}

interface StatItem {
  label: string
  value: string
}

/** Le metriche salvate nella seduta (senza file FIT). */
function Stats({ d, m }: { d: EnduranceDiscipline; m: EnduranceMetrics }) {
  const { t } = useI18n()
  const g = t.garmin
  const speed = avgSpeed(m.distanceM, m.durationS)
  const items: (StatItem | false | undefined)[] = [
    m.distanceM !== undefined && {
      label: g.distance,
      value: distText(m.distanceM, d),
    },
    { label: g.movingTime, value: formatClock(m.movingS ?? m.durationS) },
    m.elapsedS !== undefined && {
      label: g.elapsedTime,
      value: formatClock(m.elapsedS),
    },
    speed !== undefined && {
      label: d === 'bike' ? g.avgSpeed : g.pace,
      value: speedText(speed, d),
    },
    m.elevationGainM !== undefined && {
      label: g.elevGain,
      value: `${m.elevationGainM} m`,
    },
    m.avgHr !== undefined && { label: g.avgHr, value: `${m.avgHr} bpm` },
    m.maxHr !== undefined && { label: g.maxHr, value: `${m.maxHr} bpm` },
    m.calories !== undefined && {
      label: g.calories,
      value: `${m.calories} kcal`,
    },
    m.avgPowerW !== undefined && {
      label: g.avgPower,
      value: `${m.avgPowerW} W`,
    },
    m.normPowerW !== undefined && {
      label: g.normPower,
      value: `${m.normPowerW} W`,
    },
  ]
  return <StatGrid items={items} />
}

function StatGrid({ items }: { items: (StatItem | false | undefined)[] }) {
  return (
    <dl className="gm-stats">
      {items
        .filter((x): x is StatItem => !!x)
        .map((x) => (
          <div key={x.label}>
            <dt>{x.label}</dt>
            <dd>{x.value}</dd>
          </div>
        ))}
    </dl>
  )
}

const CHART_FIELDS: Record<EnduranceDiscipline, SeriesField[]> = {
  run: ['pace', 'hr', 'alt', 'cad', 'pw', 'temp'],
  bike: ['speed', 'hr', 'alt', 'cad', 'pw', 'temp'],
  swim: ['pace', 'hr', 'cad', 'temp'],
}

/** Una frazione con il file FIT: tutto quello che c'è. */
function LegDetail({
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

interface Row {
  n: number
  distanceM: number
  durationS: number
  avgHr?: number
  avgPowerW?: number
  elevationM?: number
  cadence?: number
}

function SplitTable({ d, rows }: { d: EnduranceDiscipline; rows: Row[] }) {
  const { t } = useI18n()
  const g = t.garmin
  const has = (k: keyof Row) => rows.some((r) => r[k] !== undefined)
  const fastest = Math.max(
    ...rows.map((r) => (r.durationS ? r.distanceM / r.durationS : 0)),
  )
  return (
    <div className="gm-table-wrap">
      <table className="gm-table">
        <thead>
          <tr>
            <th>{g.colN}</th>
            <th>{g.colDist}</th>
            <th>{g.colTime}</th>
            <th>{d === 'bike' ? g.colSpeed : g.colPace}</th>
            {has('avgHr') && <th>{g.colHr}</th>}
            {has('avgPowerW') && <th>{g.colPower}</th>}
            {has('cadence') && <th>{g.colCad}</th>}
            {d !== 'swim' && has('elevationM') && <th>{g.colElev}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const v = r.durationS ? r.distanceM / r.durationS : 0
            return (
              <tr key={r.n}>
                <td>{r.n}</td>
                <td>{distText(r.distanceM, d)}</td>
                <td>{formatClock(r.durationS)}</td>
                <td className="gm-bar-cell">
                  <span
                    className="gm-bar"
                    style={{ width: `${fastest ? (v / fastest) * 100 : 0}%` }}
                  />
                  <span>{v ? speedText(v, d) : '—'}</span>
                </td>
                {has('avgHr') && (
                  <td>{r.avgHr !== undefined ? Math.round(r.avgHr) : '—'}</td>
                )}
                {has('avgPowerW') && (
                  <td>
                    {r.avgPowerW !== undefined ? Math.round(r.avgPowerW) : '—'}
                  </td>
                )}
                {has('cadence') && <td>{r.cadence ?? '—'}</td>}
                {d !== 'swim' && has('elevationM') && (
                  <td>
                    {r.elevationM !== undefined
                      ? `${r.elevationM > 0 ? '+' : ''}${r.elevationM}`
                      : '—'}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Lengths({ s }: { s: FitSession }) {
  const { t } = useI18n()
  const g = t.garmin
  // numero della vasca (le pause non contano)
  const numbers = s.lengths.reduce<number[]>(
    (acc, l) => [...acc, (acc[acc.length - 1] ?? 0) + (l.active ? 1 : 0)],
    [],
  )
  return (
    <section className="gm-sec">
      <h2>{g.swimLengths}</h2>
      <div className="gm-table-wrap">
        <table className="gm-table">
          <thead>
            <tr>
              <th>{g.colN}</th>
              <th>{g.colTime}</th>
              <th>{g.strokes}</th>
              <th>SWOLF</th>
            </tr>
          </thead>
          <tbody>
            {s.lengths.map((l, i) => {
              if (!l.active)
                return (
                  <tr key={i} className="gm-rest">
                    <td />
                    <td>{formatClock(Math.round(l.durationS))}</td>
                    <td colSpan={2}>{g.rest}</td>
                  </tr>
                )
              const stroke = l.stroke
                ? (g.stroke as Record<string, string>)[l.stroke]
                : undefined
              return (
                <tr key={i}>
                  <td>
                    {numbers[i]}
                    {stroke && <small> · {stroke}</small>}
                  </td>
                  <td>{formatClock(Math.round(l.durationS))}</td>
                  <td>{l.strokes ?? '—'}</td>
                  <td>
                    {l.strokes !== undefined
                      ? Math.round(l.durationS + l.strokes)
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Limiti delle zone in testo: "≤ 120", "121–140", "> 180". */
function zoneRange(bounds: number[], k: number, unit: string) {
  if (k === 0) return `≤ ${bounds[0]} ${unit}`
  if (k === bounds.length) return `> ${bounds[k - 1]} ${unit}`
  return `${bounds[k - 1] + 1}–${bounds[k]} ${unit}`
}

function ZoneBars({
  title,
  source,
  bounds,
  seconds,
  unit,
}: {
  title: string
  source: string
  bounds: number[]
  seconds: number[]
  unit: string
}) {
  const total = seconds.reduce((a, b) => a + b, 0)
  if (!total) return null
  return (
    <section className="gm-sec">
      <h2>
        {title} <small className="gm-src">· {source}</small>
      </h2>
      <ul className="gm-zones">
        {seconds.map((sec, k) => (
          <li
            key={k}
            style={{ ['--z' as string]: k / Math.max(1, seconds.length - 1) }}
          >
            <span className="gm-z-name">
              Z{k + 1} <small>{zoneRange(bounds, k, unit)}</small>
            </span>
            <span className="gm-z-track">
              <span
                className="gm-z-fill"
                style={{ width: `${(sec / total) * 100}%` }}
              />
            </span>
            <span className="gm-z-val">
              {formatClock(sec)}{' '}
              <small>{Math.round((sec / total) * 100)} %</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Zones({
  pts,
  s,
  thresholds,
}: {
  pts: FitPoint[]
  s: FitSession
  thresholds: Thresholds
}) {
  const { t } = useI18n()
  const g = t.garmin
  const hasHr = pts.some((p) => p.hr !== undefined)
  const hasPw = pts.some((p) => p.pw !== undefined)
  const hrBounds = thresholds.maxHr
    ? hrZoneBounds(thresholds.maxHr, thresholds.restHr)
    : undefined
  const pwBounds = thresholds.ftp ? powerZoneBounds(thresholds.ftp) : undefined
  const hr = hrBounds
    ? {
        bounds: hrBounds,
        seconds: timeInZones(pts, 'hr', hrBounds),
        source: g.zonesFromYou,
      }
    : s.hrZones && {
        bounds: s.hrZones.boundaries,
        seconds: s.hrZones.seconds,
        source: g.zonesFromWatch,
      }
  const pw = pwBounds
    ? {
        bounds: pwBounds,
        seconds: timeInZones(pts, 'pw', pwBounds),
        source: g.zonesFromYou,
      }
    : s.powerZones && {
        bounds: s.powerZones.boundaries,
        seconds: s.powerZones.seconds,
        source: g.zonesFromWatch,
      }
  return (
    <>
      {hasHr && hr && <ZoneBars title={g.hrZones} unit="bpm" {...hr} />}
      {hasPw && pw && <ZoneBars title={g.powerZones} unit="W" {...pw} />}
      {((hasHr && !hrBounds) || (hasPw && !pwBounds)) && (
        <p className="gm-hint">{g.zonesHint}</p>
      )}
    </>
  )
}

function BestEfforts({ pts, d }: { pts: FitPoint[]; d: EnduranceDiscipline }) {
  const { t } = useI18n()
  const g = t.garmin
  const run = d === 'run' ? bestRunEfforts(pts) : []
  const power = d === 'bike' ? bestPowerEfforts(pts) : []
  if (!run.length && !power.length) return null
  return (
    <section className="gm-sec">
      <h2>{g.best}</h2>
      <dl className="gm-stats">
        {run.map((b) => (
          <div key={b.target}>
            <dt>{(g.bestRun as Record<string, string>)[String(b.target)]}</dt>
            <dd>
              {formatClock(b.value)}{' '}
              <small>{speedText(b.target / b.value, 'run')}</small>
            </dd>
          </div>
        ))}
        {power.map((b) => (
          <div key={b.target}>
            <dt>{(g.bestPower as Record<string, string>)[String(b.target)]}</dt>
            <dd>{b.value} W</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
