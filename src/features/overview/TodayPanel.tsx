import type { Session } from '../../data/types'
import { DisciplineIcon } from '../../components/ui/Icons'
import { useI18n } from '../../i18n/context'
import { parseIsoDate, todayIso } from '../../lib/dates'
import { formatDist, templateTotals } from '../../lib/enduranceTemplate'
import { formatDistance, formatDuration } from '../../lib/format'
import { sessionDurationSec, sessionSetsCount } from '../../lib/sessions'
import { actualSeconds } from '../../lib/weekStats'

/** Distanza: quella eseguita se c'è, altrimenti quella del piano (può mancare). */
function distanceText(s: Session): string | null {
  if (s.discipline === 'strength') return null
  if (s.actual) return formatDistance(s.actual.distanceM, s.discipline)
  const totals = templateTotals({ discipline: s.discipline, ...s.plan })
  if (totals.distanceM === null) return null
  return `${totals.distanceComplete ? '' : '≥ '}${formatDist(totals.distanceM, s.discipline)}`
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
            const disc = s.discipline
            const secs =
              s.status === 'done' ? actualSeconds(s) : sessionDurationSec(s)
            const extra =
              s.discipline === 'strength'
                ? `${sessionSetsCount(s)} ${t.sets}`
                : distanceText(s)
            const details = [
              secs ? formatDuration(secs) : t.overview.durationUnknown,
              extra,
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <div className="ses" data-discipline={disc} key={s.id}>
                <div className="ic">
                  <DisciplineIcon discipline={disc} />
                </div>
                <div className="tx">
                  <b>{s.name ?? t.discipline[disc]}</b>
                  <span>{details}</span>
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
