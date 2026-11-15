import { useEffect, useRef, useState } from 'react'
import { DisciplineIcon } from '../../components/ui/Icons'
import type { Discipline, IsoDate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { parseIsoDate } from '../../lib/dates'
import { DISCIPLINES } from '../../lib/weekStats'
import { capitalize } from './period'

interface Props {
  date: IsoDate
  /** Posizione di inserimento nel giorno, da 0. */
  index: number
  onClose: () => void
}

/**
 * Finestra "+": prima la scelta 2×2 della disciplina, poi (per ora) solo un
 * segnaposto. Le schede vere arriveranno dopo.
 */
export default function NewWorkoutDialog({ date, index, onClose }: Props) {
  const { t } = useI18n()
  const [discipline, setDiscipline] = useState<Discipline | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [onClose])

  useEffect(() => {
    boxRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [discipline])

  const d = parseIsoDate(date)
  const fullDate = `${capitalize(t.weekdaysLong[d.getDay()])} ${d.getDate()} ${t.monthsLong[d.getMonth()]} ${d.getFullYear()}`
  const title = discipline
    ? `${t.calendar.newWorkout} – ${t.discipline[discipline]}`
    : t.calendar.chooseDiscipline

  return (
    <div
      className="cal-mod"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="cal-box"
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="cal-box-h">
          <div>
            <h3>{title}</h3>
            <p>
              {fullDate}
              {discipline && ` · ${t.calendar.position} ${index + 1}`}
            </p>
          </div>
          <button
            type="button"
            className="cal-x"
            aria-label={t.calendar.close}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {discipline ? (
          <div className="ph">{t.calendar.placeholder}</div>
        ) : (
          <div className="cal-pick">
            {DISCIPLINES.map((disc) => (
              <button
                type="button"
                key={disc}
                data-discipline={disc}
                onClick={() => setDiscipline(disc)}
              >
                <DisciplineIcon discipline={disc} />
                {t.discipline[disc]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
