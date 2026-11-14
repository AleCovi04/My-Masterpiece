import type { Session } from '../../data/types'
import { DisciplineIcon } from '../../components/ui/Icons'
import { useI18n } from '../../i18n/context'
import { parseIsoDate, todayIso } from '../../lib/dates'
import { formatDistance, formatDuration } from '../../lib/format'
import { actualSeconds, plannedSeconds } from '../../lib/weekStats'

function sessionDistanceM(s: Session): number {
  const p = s.plan
  if (p.discipline === 'strength') return 0
  if (p.discipline === 'run' && p.mode === 'intervals') {
    return p.intervals.reduce((n, i) => n + i.distanceM, 0)
  }
  return s.actual && s.actual.discipline !== 'strength'
    ? s.actual.distanceM
    : p.distanceM
}

function setsCount(s: Session): number {
  return s.plan.discipline === 'strength'
    ? s.plan.exercises.reduce((n, e) => n + e.sets.length, 0)
    : 0
}

export default function TodayPanel({ sessions }: { sessions: Session[] }) {
  const { t } = useI18n()
  const today = todayIso()
  const d = parseIsoDate(today)
  const list = sessions
    .filter((s) => s.date === today)
    .sort((a, b) => a.order - b.order)

  return (
    <section className="panel">
      <h3>{t.overview.today}</h3>
      <div className="sub">
        {t.weekdaysLong[d.getDay()]} {d.getDate()} {t.monthsShort[d.getMonth()]}
      </div>
      <div className="today-list">
        {list.length === 0 ? (
          <div className="rest">{t.overview.restDay}</div>
        ) : (
          list.map((s) => {
            const disc = s.plan.discipline
            const secs =
              s.status === 'done' ? actualSeconds(s) : plannedSeconds(s)
            const meters = sessionDistanceM(s)
            const extra =
              disc === 'strength'
                ? `${setsCount(s)} ${t.sets}`
                : formatDistance(meters, disc)
            return (
              <div className="ses" data-discipline={disc} key={s.id}>
                <div className="ic">
                  <DisciplineIcon discipline={disc} />
                </div>
                <div className="tx">
                  <b>{t.discipline[disc]}</b>
                  <span>
                    {formatDuration(secs)} · {extra}
                  </span>
                </div>
                <span className={`tag ${s.status}`}>{t.status[s.status]}</span>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
