import { LegIcons } from '../../components/ui/Icons'
import { brickSports } from '../../lib/brick'
import { useRef, type MouseEvent } from 'react'
import type { Id, IsoDate, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { parseIsoDate, todayIso } from '../../lib/dates'
import { formatHm } from '../../lib/format'
import { sessionsOn } from '../../lib/reorder'
import { sessionDurationSec } from '../../lib/sessions'
import { actualSeconds } from '../../lib/weekStats'
import { weekDates, weekdayShortNames } from './period'
import { useMediaQuery } from './useMediaQuery'
import { useReorder } from './useReorder'

interface Props {
  anchor: IsoDate
  sessions: Session[]
  selected: IsoDate | null
  onSelect: (date: IsoDate | null) => void
  onAdd: (date: IsoDate, index: number) => void
  onMove: (id: Id, date: IsoDate, index: number) => void
  onOpen: (id: Id) => void
}

export default function WeekView({
  anchor,
  sessions,
  selected,
  onSelect,
  onAdd,
  onMove,
  onOpen,
}: Props) {
  const { t } = useI18n()
  const gridRef = useRef<HTMLDivElement>(null)
  const mouseDrag = useMediaQuery('(hover: hover) and (pointer: fine)')
  const reorder = useReorder({
    containerRef: gridRef,
    selectedDay: selected,
    mouseDrag,
    onMove,
  })
  const today = todayIso()
  const names = weekdayShortNames(t)

  const insert = (date: IsoDate, index: number, cls: string) =>
    selected !== date ? null : (
      <button
        type="button"
        className={`cal-ins ${cls}`}
        aria-label={t.calendar.addWorkout}
        onClick={(e: MouseEvent) => {
          e.stopPropagation()
          onAdd(date, index)
        }}
      >
        +
      </button>
    )

  return (
    <div
      className="cal-wk"
      ref={gridRef}
      onDragLeave={reorder.onContainerDragLeave}
    >
      {weekDates(anchor).map((date, i) => {
        const list = sessionsOn(sessions, date)
        const isSel = selected === date
        return (
          <div
            key={date}
            className={`cal-day${date === today ? ' today' : ''}${isSel ? ' sel' : ''}`}
            data-day={date}
            onClick={() => {
              if (reorder.shouldSuppressClick()) return
              onSelect(isSel ? null : date)
            }}
            {...reorder.dayProps(date)}
          >
            <button type="button" className="cal-day-h" aria-pressed={isSel}>
              <span>{names[i]}</span>
              <b>{parseIsoDate(date).getDate()}</b>
            </button>
            <div className="cal-list" data-list={date}>
              {list.length === 0
                ? insert(date, 0, 'only')
                : list.map((s, k) => {
                    const disc = s.discipline
                    const name = s.name ?? t.discipline[disc]
                    const secs =
                      s.status === 'done'
                        ? actualSeconds(s)
                        : sessionDurationSec(s)
                    const open = () => {
                      if (!reorder.shouldSuppressClick()) onOpen(s.id)
                    }
                    return (
                      <div className="cal-cw" key={s.id}>
                        {k === 0 && insert(date, 0, 'top')}
                        <div
                          className={`cal-card${reorder.draggingId === s.id ? ' dragging' : ''}${reorder.liftedId === s.id ? ' lifted' : ''}`}
                          data-sid={s.id}
                          data-discipline={disc}
                          data-status={s.status}
                          role="button"
                          tabIndex={0}
                          aria-label={`${name}, ${t.status[s.status]}`}
                          onClick={(e) => {
                            // il clic sulla card apre il dettaglio, non (de)seleziona il giorno
                            e.stopPropagation()
                            open()
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return
                            e.preventDefault()
                            e.stopPropagation()
                            open()
                          }}
                          onContextMenu={(e) => {
                            // su telefono il tocco prolungato non deve aprire il menu del browser
                            if (!mouseDrag) e.preventDefault()
                          }}
                          {...reorder.cardProps(s.id)}
                        >
                          <b>{name}</b>
                          {s.discipline === 'brick' && (
                            <LegIcons sports={brickSports(s.plan.legs)} />
                          )}
                          <span>
                            {secs ? `${formatHm(secs)} · ` : ''}
                            {t.status[s.status]}
                          </span>
                        </div>
                        {insert(
                          date,
                          k + 1,
                          k === list.length - 1 ? 'bot' : 'mid',
                        )}
                      </div>
                    )
                  })}
              {reorder.indicator?.date === date && (
                <div
                  className="cal-ind"
                  style={{ top: reorder.indicator.line }}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
