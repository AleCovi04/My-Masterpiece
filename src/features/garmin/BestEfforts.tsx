import type { EnduranceDiscipline } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatClock } from '../../lib/enduranceTemplate'
import { bestPowerEfforts, bestRunEfforts } from '../../lib/fit/analysis'
import type { FitPoint } from '../../lib/fit/types'
import { speedText } from './format'

export function BestEfforts({
  pts,
  d,
}: {
  pts: FitPoint[]
  d: EnduranceDiscipline
}) {
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
