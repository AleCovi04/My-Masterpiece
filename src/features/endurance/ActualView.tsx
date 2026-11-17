import { DisciplineIcon } from '../../components/ui/Icons'
import type {
  BrickSession,
  EnduranceDiscipline,
  EnduranceMetrics,
  EnduranceSession,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { legTotals } from '../../lib/brick'
import {
  averageIntensity,
  brickActualTotals,
  deviationPct,
} from '../../lib/enduranceActual'
import {
  formatClock,
  formatDist,
  formatIntensity,
  templateTotals,
} from '../../lib/enduranceTemplate'
import { sessionDurationSec } from '../../lib/sessions'
import './endurance.css'

/** "+5 %", "−3 %", "0 %". */
function Dev({ pct }: { pct: number | null }) {
  const { t } = useI18n()
  if (pct === null) return null
  const text = `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)} %`
  return (
    <small className="ea-dev" title={t.endurance.vsPlan}>
      {text}
    </small>
  )
}

/** L'eseguito di una seduta endurance o di un brick, con lo scostamento dal piano. */
export default function ActualView({
  session: s,
}: {
  session: EnduranceSession | BrickSession
}) {
  const { t } = useI18n()
  const e = t.endurance
  const a = s.actual
  if (!a) return null

  const extra = (
    <>
      {a.rpe !== undefined && (
        <div>
          <dt>{e.rpeShort}</dt>
          <dd>{a.rpe}/10</dd>
        </div>
      )}
      {a.notes && (
        <div className="sd-wide">
          <dt>{e.notes}</dt>
          <dd>{a.notes}</dd>
        </div>
      )}
    </>
  )

  if (s.discipline !== 'brick' && a.discipline !== 'brick') {
    const plannedDist = templateTotals({
      discipline: s.discipline,
      ...s.plan,
    }).distanceM
    return (
      <dl className="sd-meta ea-view">
        <div>
          <dt>{e.time}</dt>
          <dd>
            {formatClock(a.durationS)}{' '}
            <Dev pct={deviationPct(a.durationS, sessionDurationSec(s))} />
          </dd>
        </div>
        <div>
          <dt>{e.distance}</dt>
          <dd>
            {a.distanceM ? formatDist(a.distanceM, s.discipline) : '—'}{' '}
            <Dev pct={deviationPct(a.distanceM, plannedDist)} />
          </dd>
        </div>
        <Metrics d={s.discipline} m={a} />
        {extra}
      </dl>
    )
  }

  if (s.discipline !== 'brick' || a.discipline !== 'brick') return null
  const totals = brickActualTotals(a)
  return (
    <div className="ea-view">
      <dl className="sd-meta">
        <div>
          <dt>{e.totalTime}</dt>
          <dd>
            {formatClock(totals.durationS)}{' '}
            <Dev pct={deviationPct(totals.durationS, sessionDurationSec(s))} />
          </dd>
        </div>
        <div>
          <dt>{e.transitions}</dt>
          <dd>
            {totals.transitionsS > 0 ? formatClock(totals.transitionsS) : '—'}
          </dd>
        </div>
        {extra}
      </dl>
      {a.legs.map((l, i) => {
        const plan = s.plan.legs.find((x) => x.id === l.legId)
        const pt = plan ? legTotals(plan) : null
        return (
          <section
            key={l.legId}
            className="sd-leg"
            data-discipline={l.discipline}
          >
            {i > 0 && l.transitionBeforeS ? (
              <p className="sd-trans">
                {e.transitionShort}: {formatClock(l.transitionBeforeS)}
              </p>
            ) : null}
            <h4 className="sd-leg-h">
              <span className="wk-ic">
                <DisciplineIcon discipline={l.discipline} />
              </span>
              {e.leg} {i + 1} · {t.discipline[l.discipline]}
            </h4>
            <dl className="sd-meta">
              <div>
                <dt>{e.time}</dt>
                <dd>
                  {formatClock(l.durationS)}{' '}
                  <Dev pct={deviationPct(l.durationS, pt?.durationS)} />
                </dd>
              </div>
              <div>
                <dt>{e.distance}</dt>
                <dd>
                  {l.distanceM ? formatDist(l.distanceM, l.discipline) : '—'}{' '}
                  <Dev pct={deviationPct(l.distanceM, pt?.distanceM)} />
                </dd>
              </div>
              <Metrics d={l.discipline} m={l} />
            </dl>
          </section>
        )
      })}
    </div>
  )
}

/** Passo o velocità, FC e dislivello (solo se inseriti). */
function Metrics({ d, m }: { d: EnduranceDiscipline; m: EnduranceMetrics }) {
  const { t } = useI18n()
  const e = t.endurance
  const avg = averageIntensity(d, m)
  return (
    <>
      {avg !== null && (
        <div>
          <dt>{d === 'bike' ? e.speed : e.pace}</dt>
          <dd>{formatIntensity(avg, d)}</dd>
        </div>
      )}
      {(m.avgHr || m.maxHr) && (
        <div>
          <dt>{e.hr}</dt>
          <dd>
            {m.avgHr ?? '—'} / {m.maxHr ?? '—'} {e.bpm}
          </dd>
        </div>
      )}
      {m.elevationGainM !== undefined && (
        <div>
          <dt>{e.elevation}</dt>
          <dd>{m.elevationGainM} m</dd>
        </div>
      )}
    </>
  )
}
