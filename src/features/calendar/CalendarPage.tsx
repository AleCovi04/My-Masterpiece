import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Id, IsoDate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { todayIso } from '../../lib/dates'
import { liveSessions } from '../../lib/liveWorkout'
import { emptySession, sessionFromTemplate } from '../../lib/sessions'
import { LIVE_PATH } from '../live/hooks'
import MonthView from './MonthView'
import SessionDetail from './SessionDetail'
import TemplatePickerDialog from './TemplatePickerDialog'
import WeekView from './WeekView'
import YearView from './YearView'
import { periodLabel, shiftAnchor, type CalendarView } from './period'
import { useCalendarSessions } from './useCalendarSessions'
import './calendar.css'

const VIEWS: CalendarView[] = ['week', 'month', 'year']

export default function CalendarPage() {
  const { t } = useI18n()
  const cal = useCalendarSessions()
  const navigate = useNavigate()
  const { sessions } = cal
  // entrando si apre sempre la settimana corrente
  const [view, setView] = useState<CalendarView>('week')
  const [anchor, setAnchor] = useState<IsoDate>(todayIso)
  const [selected, setSelected] = useState<IsoDate | null>(null)
  const [adding, setAdding] = useState<{ date: IsoDate; index: number } | null>(
    null,
  )
  const [openId, setOpenId] = useState<Id | null>(null)
  const c = t.calendar
  const opened = openId ? sessions?.find((s) => s.id === openId) : undefined

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
          onMove={cal.move}
          onOpen={setOpenId}
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
        <TemplatePickerDialog
          date={adding.date}
          index={adding.index}
          templates={cal.templates}
          exercises={cal.exercises}
          onPickTemplate={(template) => {
            cal.add(
              sessionFromTemplate(template, adding.date),
              adding.date,
              adding.index,
            )
            setAdding(null)
          }}
          onPickEmpty={(discipline) => {
            cal.add(
              emptySession(discipline, adding.date),
              adding.date,
              adding.index,
            )
            setAdding(null)
          }}
          onClose={() => setAdding(null)}
        />
      )}

      {opened && (
        <SessionDetail
          key={opened.id}
          session={opened}
          templates={cal.templates}
          exercises={cal.exercises}
          onEditPlan={(edited) => cal.editPlan(opened.id, edited)}
          onMoveDate={(date) => cal.moveToDate(opened.id, date)}
          onDuplicate={() => {
            cal.duplicate(opened.id)
            setOpenId(null)
          }}
          onStatus={(status) => cal.setStatus(opened.id, status)}
          onDelete={() => {
            cal.remove(opened.id)
            setOpenId(null)
          }}
          onClose={() => setOpenId(null)}
          liveElsewhere={liveSessions(sessions ?? []).some(
            (x) => x.id !== opened.id,
          )}
          onStart={async () => {
            await cal.start(opened.id)
            navigate(LIVE_PATH)
          }}
          onResume={() => navigate(LIVE_PATH)}
        />
      )}
    </div>
  )
}
