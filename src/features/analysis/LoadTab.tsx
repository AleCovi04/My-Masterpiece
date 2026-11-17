import { useMemo } from 'react'
import type { IsoDate, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import type { Bucket, Range } from '../../lib/analysis'
import { parseIsoDate } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import {
  DEFAULT_RPE,
  fitnessFatigue,
  loadBySport,
  totalLoad,
  withoutRpe,
} from '../../lib/load'
import { DISCIPLINES } from '../../lib/weekStats'
import BarChart from './BarChart'
import LineChart from './LineChart'

interface Props {
  /** Tutte le sedute: Forma e Fatica tengono conto dello storico. */
  allSessions: Session[]
  /** Le sedute del periodo. */
  sessions: Session[]
  range: Range
  buckets: Bucket[]
  ticks: string[]
  titles: string[]
  today: IsoDate
}

const int = (v: number) => String(Math.round(v))

/** Carico: sRPE per intervallo e curve Forma/Fatica. */
export default function LoadTab({
  allSessions,
  sessions,
  range,
  buckets,
  ticks,
  titles,
  today,
}: Props) {
  const { t } = useI18n()
  const a = t.analysis

  const perBucket = useMemo(
    () =>
      buckets.map((b) =>
        loadBySport(
          sessions.filter((s) => s.date >= b.start && s.date <= b.end),
        ),
      ),
    [sessions, buckets],
  )
  const total = perBucket.reduce((sum, l) => sum + totalLoad(l), 0)
  const missing = withoutRpe(sessions)

  // le curve si fermano a oggi: il futuro non ha carico
  const end = range.end < today ? range.end : today
  const points = useMemo(
    () =>
      range.start <= end ? fitnessFatigue(allSessions, range.start, end) : [],
    [allSessions, range.start, end],
  )
  const last = points[points.length - 1]
  const form = last ? last.fitness - last.fatigue : 0
  const dayTicks = points.map((p) => {
    const d = parseIsoDate(p.date)
    return `${d.getDate()} ${t.monthsShort[d.getMonth()]}`
  })

  return (
    <div className="ana-grid">
      <section className="panel">
        <h3>{a.loadTitle}</h3>
        <div className="chips sm">
          {DISCIPLINES.map((d) => (
            <span
              key={d}
              className="chip locked"
              data-discipline={d}
              aria-pressed="true"
            >
              <i />
              {t.discipline[d]}
            </span>
          ))}
        </div>
        <p className="sub">
          {a.loadTotal} <b>{int(total)}</b> · {a.loadPerBucket}{' '}
          {int(buckets.length ? total / buckets.length : 0)}
        </p>
        <BarChart
          label={a.loadTitle}
          ticks={ticks}
          titles={titles}
          stacks={DISCIPLINES.map((d) => ({
            key: d,
            label: t.discipline[d],
            color: `var(--${d})`,
            values: perBucket.map((l) => l[d]),
          }))}
          totalLabel={a.total}
          format={int}
        />
        <p className="note ana-legend">
          {a.loadHow}
          {missing > 0 &&
            ` · ${a.noRpe.replace('{n}', String(missing)).replace('{rpe}', String(DEFAULT_RPE))}`}
        </p>
      </section>

      <section className="panel">
        <h3>{a.formTitle}</h3>
        <dl className="ana-figs">
          <div>
            <dt>
              <i className="ana-key" style={{ background: 'var(--ok)' }} />
              {a.fitness}
            </dt>
            <dd>{int(last?.fitness ?? 0)}</dd>
          </div>
          <div>
            <dt>
              <i className="ana-key" style={{ background: 'var(--warn)' }} />
              {a.fatigue}
            </dt>
            <dd>{int(last?.fatigue ?? 0)}</dd>
          </div>
          <div>
            <dt>{a.freshness}</dt>
            <dd>{form > 0 ? `+${int(form)}` : int(form)}</dd>
          </div>
        </dl>
        <LineChart
          label={a.formTitle}
          ticks={dayTicks}
          titles={points.map((p) => formatLongDate(p.date, t.monthsShort))}
          series={[
            {
              key: 'fitness',
              label: a.fitness,
              color: 'var(--ok)',
              values: points.map((p) => p.fitness),
            },
            {
              key: 'fatigue',
              label: a.fatigue,
              color: 'var(--warn)',
              values: points.map((p) => p.fatigue),
            },
          ]}
          format={int}
        />
        <p className="note ana-legend">{a.formHow}</p>
      </section>
    </div>
  )
}
