import type { EnduranceDiscipline, EnduranceMetrics } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatClock } from '../../lib/enduranceTemplate'
import { avgSpeed, distText, speedText } from './format'

export interface StatItem {
  label: string
  value: string
}

/** Le metriche salvate nella seduta (senza file FIT). */
export function Stats({
  d,
  m,
}: {
  d: EnduranceDiscipline
  m: EnduranceMetrics
}) {
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

export function StatGrid({
  items,
}: {
  items: (StatItem | false | undefined)[]
}) {
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
