import { useEffect, useRef, useState } from 'react'
import { useBackClose } from '../../hooks/useBackClose'
import type { IsoDate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { parseIsoDate, toIsoDate, todayIso } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'

interface Props {
  value: IsoDate | null
  onChange: (date: IsoDate | null) => void
}

export default function RaceDatePicker({ value, onChange }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState({ y: 0, m: 0 })
  useBackClose(open, () => setOpen(false))
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    if (!open) {
      const base = value ? parseIsoDate(value) : new Date()
      setView({ y: base.getFullYear(), m: base.getMonth() })
    }
    setOpen(!open)
  }

  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const today = todayIso()
  const o = t.overview

  return (
    <div className="race" ref={rootRef}>
      <span className="lbl">{o.raceDate}</span>
      <button
        className="date-btn"
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {value ? formatLongDate(value, t.monthsShort) : o.infinite}
      </button>
      {open && (
        <div className="pop" role="dialog" aria-label={o.raceDate}>
          <div className="pop-head">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label={o.prevMonth}
            >
              ‹
            </button>
            <b>
              {t.monthsLong[view.m]} {view.y}
            </b>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label={o.nextMonth}
            >
              ›
            </button>
          </div>
          <div className="grid7">
            {t.weekdayInitials.map((x, i) => (
              <span className="dn" key={i}>
                {x}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const iso = toIsoDate(new Date(view.y, view.m, i + 1))
              const cls = [iso === value && 'sel', iso === today && 'today']
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={iso}
                  type="button"
                  className={cls}
                  aria-pressed={iso === value}
                  onClick={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className={`inf${value === null ? ' sel' : ''}`}
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
          >
            {o.infinite}
          </button>
        </div>
      )}
    </div>
  )
}
