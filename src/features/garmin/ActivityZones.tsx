import type { Thresholds } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatClock } from '../../lib/enduranceTemplate'
import {
  hrZoneBounds,
  powerZoneBounds,
  timeInZones,
} from '../../lib/fit/analysis'
import type { FitPoint, FitSession } from '../../lib/fit/types'

/** Limiti delle zone in testo: "≤ 120", "121–140", "> 180". */
function zoneRange(bounds: number[], k: number, unit: string) {
  if (k === 0) return `≤ ${bounds[0]} ${unit}`
  if (k === bounds.length) return `> ${bounds[k - 1]} ${unit}`
  return `${bounds[k - 1] + 1}–${bounds[k]} ${unit}`
}

export function ZoneBars({
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

export function Zones({
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
