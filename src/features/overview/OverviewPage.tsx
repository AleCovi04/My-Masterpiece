import { useState } from 'react'
import type { Discipline } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  addDays,
  daysBetween,
  mondayOf,
  toIsoDate,
  todayIso,
} from '../../lib/dates'
import { formatDuration } from '../../lib/format'
import { DISCIPLINES, sessionsInWeek, summarize } from '../../lib/weekStats'
import LoadChart from './LoadChart'
import RaceDatePicker from './RaceDatePicker'
import TodayPanel from './TodayPanel'
import { useOverviewData } from './useOverviewData'
import './overview.css'

export default function OverviewPage() {
  const { t } = useI18n()
  const { data, setRaceDate } = useOverviewData()
  const [active, setActive] = useState<Set<Discipline>>(
    () => new Set(DISCIPLINES),
  )

  if (!data) return null

  const o = t.overview
  const today = todayIso()
  const monday = mondayOf(new Date())
  const sunday = addDays(monday, 6)
  const week = sessionsInWeek(data.sessions, toIsoDate(monday))
  const filtered = week.filter((s) => active.has(s.plan.discipline))
  const sum = summarize(filtered, today)

  const days = data.raceDate
    ? Math.max(0, daysBetween(today, data.raceDate))
    : null
  const rangeText = `${monday.getDate()} ${t.monthsShort[monday.getMonth()]} – ${sunday.getDate()} ${t.monthsShort[sunday.getMonth()]} ${sunday.getFullYear()}`

  const toggle = (d: Discipline) => {
    if (active.has(d) && active.size === 1) return // almeno una attiva
    const next = new Set(active)
    if (!next.delete(d)) next.add(d)
    setActive(next)
  }

  const donePct = sum.plannedS
    ? Math.min(100, Math.round((100 * sum.doneS) / sum.plannedS))
    : 0
  const sessPct = sum.totalCount
    ? Math.round((100 * sum.doneCount) / sum.totalCount)
    : 0

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">{o.eyebrow}</div>
          <h1>
            Road to <em>70.3</em>
          </h1>
        </div>
        <div className="count">
          <div>
            <div className="n">{days ?? '∞'}</div>
            <span className="l">{o.days}</span>
          </div>
          <div>
            <div className="n">
              {days === null ? '∞' : Math.floor(days / 7)}
            </div>
            <span className="l">{o.weeks}</span>
          </div>
        </div>
        <RaceDatePicker value={data.raceDate} onChange={setRaceDate} />
      </section>

      <blockquote className="quote">
        <p>“{t.quote.text}”</p>
        <cite>— {t.quote.author}</cite>
      </blockquote>

      <section className="week">
        <div className="week-head">
          <h2>{o.thisWeek}</h2>
          <span>{rangeText}</span>
        </div>
        <div className="chips" role="group" aria-label={o.disciplines}>
          {DISCIPLINES.map((d) => {
            const on = active.has(d)
            const locked = on && active.size === 1
            return (
              <button
                key={d}
                type="button"
                className={`chip${locked ? ' locked' : ''}`}
                data-discipline={d}
                aria-pressed={on}
                aria-disabled={locked}
                onClick={() => toggle(d)}
              >
                <i />
                {t.discipline[d]}
              </button>
            )
          })}
        </div>

        <div className="stats">
          <div className="stat">
            <span className="k">{o.plannedHours}</span>
            <span className="v">{formatDuration(sum.plannedS)}</span>
            <div className="bar">
              <b style={{ width: '100%' }} />
            </div>
          </div>
          <div className="stat">
            <span className="k">{o.completedHours}</span>
            <span className="v">{formatDuration(sum.doneS)}</span>
            <div className="bar">
              <b style={{ width: `${donePct}%` }} />
            </div>
          </div>
          <div className="stat main">
            <span className="k">{o.adherence}</span>
            <span className="v">
              {sum.adherencePct}
              <small>%</small>
            </span>
            <div className="bar">
              <b style={{ width: `${sum.adherencePct}%` }} />
            </div>
          </div>
          <div className="stat">
            <span className="k">{o.sessions}</span>
            <span className="v">
              {sum.doneCount}
              <small>/{sum.totalCount}</small>
            </span>
            <div className="bar">
              <b style={{ width: `${sessPct}%` }} />
            </div>
          </div>
        </div>

        {/* grafico e allenamento di oggi non dipendono dai chip */}
        <div className="duo">
          <TodayPanel sessions={week} />
          <section className="panel chart">
            <h3>{o.load}</h3>
            <div className="sub">{rangeText}</div>
            <LoadChart sessions={week} />
            <div className="legend">
              <span>
                <i style={{ background: 'var(--planned)' }} />
                {o.planned}
              </span>
              <span>
                <i
                  style={{
                    background:
                      'linear-gradient(90deg,var(--swim) 25%,var(--bike) 25% 50%,var(--run) 50% 75%,var(--strength) 75%)',
                  }}
                />
                {o.actual}
              </span>
            </div>
          </section>
        </div>
        <div className="note">{o.sampleNote}</div>
      </section>
    </>
  )
}
