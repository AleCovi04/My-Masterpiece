import type { IsoDate, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  addDays,
  mondayOf,
  parseIsoDate,
  toIsoDate,
  todayIso,
} from '../../lib/dates'
import { sessionsOn } from '../../lib/reorder'
import { weekdayShortNames } from './period'

interface Props {
  anchor: IsoDate
  sessions: Session[]
  onPickDay: (date: IsoDate) => void
}

export default function MonthView({ anchor, sessions, onPickDay }: Props) {
  const { t } = useI18n()
  const today = todayIso()
  const a = parseIsoDate(anchor)
  const month = a.getMonth()
  const first = new Date(a.getFullYear(), month, 1)
  const last = new Date(a.getFullYear(), month + 1, 0)

  const weeks: Date[][] = []
  for (let w = mondayOf(first); w <= last; w = addDays(w, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)))
  }

  return (
    <>
      <div className="cal-mhead" aria-hidden="true">
        {weekdayShortNames(t).map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      <div className="cal-mgrid">
        {weeks.map((week) => (
          <div className="cal-mrow" key={toIsoDate(week[0])}>
            {week.map((d) => {
              const date = toIsoDate(d)
              const list = sessionsOn(sessions, date)
              return (
                <button
                  type="button"
                  key={date}
                  className={`cal-mday${d.getMonth() !== month ? ' out' : ''}${date === today ? ' today' : ''}`}
                  aria-label={`${d.getDate()} ${t.monthsLong[d.getMonth()]} ${d.getFullYear()}`}
                  onClick={() => onPickDay(date)}
                >
                  <b>{d.getDate()}</b>
                  <span className="cal-dots">
                    {list.map((s) => (
                      <i key={s.id} data-discipline={s.plan.discipline} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
