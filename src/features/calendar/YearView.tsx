import type { IsoDate, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { parseIsoDate, toIsoDate, todayIso } from '../../lib/dates'

interface Props {
  anchor: IsoDate
  sessions: Session[]
  onPickMonth: (firstOfMonth: IsoDate) => void
}

export default function YearView({ anchor, sessions, onPickMonth }: Props) {
  const { t } = useI18n()
  const today = todayIso()
  const year = parseIsoDate(anchor).getFullYear()
  const withSessions = new Set(sessions.map((s) => s.date))

  return (
    <div className="cal-yr">
      {Array.from({ length: 12 }, (_, month) => {
        const offset = (new Date(year, month, 1).getDay() + 6) % 7
        const days = new Date(year, month + 1, 0).getDate()
        const first = toIsoDate(new Date(year, month, 1))
        return (
          <button
            type="button"
            key={month}
            className={`cal-ym${first.slice(0, 7) === today.slice(0, 7) ? ' cur' : ''}`}
            aria-label={`${t.monthsLong[month]} ${year}`}
            onClick={() => onPickMonth(first)}
          >
            <h4>{t.monthsLong[month]}</h4>
            <div className="cal-ym-g" aria-hidden="true">
              {t.weekdayInitials.map((n, i) => (
                <span key={`h${i}`}>{n}</span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`o${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const date = toIsoDate(new Date(year, month, i + 1))
                const cls =
                  date === today ? 'td' : withSessions.has(date) ? 'has' : ''
                return (
                  <span key={date} className={cls}>
                    {i + 1}
                  </span>
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
