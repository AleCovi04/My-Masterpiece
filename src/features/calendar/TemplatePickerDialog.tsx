import { useMemo, useState } from 'react'
import { DisciplineIcon } from '../../components/ui/Icons'
import type {
  Discipline,
  Exercise,
  IsoDate,
  WorkoutTemplate,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { normalizeName } from '../../lib/exercises'
import Modal from '../planner/Modal'
import TemplateCardBody from '../planner/TemplateCardBody'
import { fullDateLabel } from './period'
import '../planner/planner.css'

const DISCIPLINES: Discipline[] = ['strength', 'run', 'bike', 'swim']

interface Props {
  date: IsoDate
  /** Posizione di inserimento nel giorno, da 0. */
  index: number
  templates: WorkoutTemplate[]
  exercises: Exercise[]
  onPickTemplate: (template: WorkoutTemplate) => void
  onPickEmpty: (discipline: Discipline) => void
  onClose: () => void
}

/**
 * Finestra del "+": si sceglie un allenamento salvato (ricerca, filtro per
 * disciplina, stesse card del Planner) oppure una sessione vuota.
 */
export default function TemplatePickerDialog({
  date,
  index,
  templates,
  exercises,
  onPickTemplate,
  onPickEmpty,
  onClose,
}: Props) {
  const { t, lang } = useI18n()
  const c = t.calendar
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<Set<Discipline>>(
    () => new Set(DISCIPLINES),
  )

  const visible = useMemo(() => {
    const q = normalizeName(query)
    return templates
      .filter(
        (w) =>
          !w.archived &&
          active.has(w.discipline) &&
          (!q || normalizeName(w.name).includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, lang))
  }, [templates, query, active, lang])

  const toggle = (d: Discipline) => {
    if (active.has(d) && active.size === 1) return // almeno una attiva
    const next = new Set(active)
    if (!next.delete(d)) next.add(d)
    setActive(next)
  }

  return (
    <Modal title={c.chooseWorkout} closeLabel={c.close} onClose={onClose} wide>
      <p className="sp-sub">
        {fullDateLabel(date, t)} · {c.position} {index + 1}
      </p>

      <div className="pl-toolbar sp-toolbar">
        <input
          type="search"
          className="pl-inp pl-search"
          placeholder={c.searchTemplates}
          aria-label={c.searchTemplates}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div
          className="pl-disc"
          role="group"
          aria-label={t.planner.disciplineFilter}
        >
          {DISCIPLINES.map((d) => (
            <button
              key={d}
              type="button"
              className="pl-dchip"
              data-discipline={d}
              aria-pressed={active.has(d)}
              onClick={() => toggle(d)}
            >
              <i />
              {t.discipline[d]}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="ph sp-none">
          {c.noTemplates}
          <small>{c.noTemplatesHint}</small>
        </div>
      ) : (
        <ul className="pl-list sp-list">
          {visible.map((w) => (
            <li key={w.id} className="pl-item" data-discipline={w.discipline}>
              <button
                type="button"
                className="pl-item-main"
                onClick={() => onPickTemplate(w)}
              >
                <TemplateCardBody template={w} exercises={exercises} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="sp-empty" aria-label={c.emptySession}>
        <h4>{c.emptySession}</h4>
        <div className="sp-empty-row">
          {DISCIPLINES.filter((d) => active.has(d)).map((d) => (
            <button
              key={d}
              type="button"
              className="pl-choose-btn"
              data-discipline={d}
              aria-label={`${c.emptySession}: ${t.discipline[d]}`}
              onClick={() => onPickEmpty(d)}
            >
              <span className="wk-ic">
                <DisciplineIcon discipline={d} />
              </span>
              {t.discipline[d]}
            </button>
          ))}
        </div>
      </section>
    </Modal>
  )
}
