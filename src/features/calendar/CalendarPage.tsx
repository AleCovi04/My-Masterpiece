import { useState } from 'react'
import type { IsoDate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { todayIso } from '../../lib/dates'
import MonthView from './MonthView'
import NewWorkoutDialog from './NewWorkoutDialog'
import WeekView from './WeekView'
import YearView from './YearView'
import { periodLabel, shiftAnchor, type CalendarView } from './period'
import { useCalendarSessions } from './useCalendarSessions'
import './calendar.css'

const VIEWS: CalendarView[] = ['week', 'month', 'year']

export default function CalendarPage() {
  const { t } = useI18n()
  const { sessions, move } = useCalendarSessions()
  // entrando si apre sempre la settimana corrente
  const [view, setView] = useState<CalendarView>('week')
  const [anchor, setAnchor] = useState<IsoDate>(todayIso)
  const [selected, setSelected] = useState<IsoDate | null>(null)
  const [adding, setAdding] = useState<{ date: IsoDate; index: number } | null>(
    null,
  )
  const c = t.calendar

  const go = (nextView: CalendarView, nextAnchor: IsoDate) => {
    setView(nextView)
    setAnchor(nextAnchor)
    setSelected(null)
  }

  return (
    <div className="cal">
      <h1 className="cal-title">{c.title}</h1>
      <div className="cal-bar">
        <div className="seg" role="group" aria-label={c.views}>
          {VIEWS.map((v) => (
            <button
              type="button"
              key={v}
              aria-pressed={view === v}
              onClick={() => go(v, anchor)}
            >
              {c[v]}
            </button>
          ))}
        </div>
        <div className="cal-nav">
          <button
            type="button"
            aria-label={c.prev}
            onClick={() => go(view, shiftAnchor(view, anchor, -1))}
          >
            ‹
          </button>
          <b aria-live="polite">{periodLabel(view, anchor, t)}</b>
          <button
            type="button"
            aria-label={c.next}
            onClick={() => go(view, shiftAnchor(view, anchor, 1))}
          >
            ›
          </button>
        </div>
        <button
          type="button"
          className="cal-this"
          onClick={() => go('week', todayIso())}
        >
          {c.thisWeek}
        </button>
      </div>

      {sessions && view === 'week' && (
        <WeekView
          anchor={anchor}
          sessions={sessions}
          selected={selected}
          onSelect={setSelected}
          onAdd={(date, index) => setAdding({ date, index })}
          onMove={move}
        />
      )}
      {sessions && view === 'month' && (
        <MonthView
          anchor={anchor}
          sessions={sessions}
          onPickDay={(date) => go('week', date)}
        />
      )}
      {sessions && view === 'year' && (
        <YearView
          anchor={anchor}
          sessions={sessions}
          onPickMonth={(first) => go('month', first)}
        />
      )}

      {adding && (
        <NewWorkoutDialog
          date={adding.date}
          index={adding.index}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  )
}
