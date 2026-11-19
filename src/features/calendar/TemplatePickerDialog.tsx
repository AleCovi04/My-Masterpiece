import { useMemo, useState } from 'react'
import FilterChips from '../../components/ui/FilterChips'
import { DisciplineIcon } from '../../components/ui/Icons'
import type {
  Discipline,
  Exercise,
  IsoDate,
  WorkoutTemplate,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { normalizeName } from '../../lib/exercises'
import Modal from '../../components/ui/Modal'
import TemplateCardBody from '../forger/TemplateCardBody'
import { fullDateLabel } from '../../lib/period'
import '../forger/planner.css'

const DISCIPLINES: Discipline[] = ['strength', 'run', 'bike', 'swim', 'brick']

interface Props {
  /** Giorno e posizione di inserimento (Calendario); altrimenti `subtitle`. */
  date?: IsoDate
  /** Posizione di inserimento nel giorno, da 0. */
  index?: number
  /** Sottotitolo al posto di data e posizione (es. editor dei blocchi). */
  subtitle?: string
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
  index = 0,
  subtitle,
  templates,
  exercises,
  onPickTemplate,
  onPickEmpty,
  onClose,
}: Props) {
  const { t, lang } = useI18n()
  const c = t.calendar
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<Discipline[]>(DISCIPLINES)

  const visible = useMemo(() => {
    const q = normalizeName(query)
    return templates
      .filter(
        (w) =>
          !w.archived &&
          active.includes(w.discipline) &&
          (!q || normalizeName(w.name).includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, lang))
  }, [templates, query, active, lang])

  return (
    <Modal title={c.chooseWorkout} closeLabel={c.close} onClose={onClose} wide>
      <p className="sp-sub">
        {subtitle ??
          (date
            ? `${fullDateLabel(date, t)} · ${c.position} ${index + 1}`
            : '')}
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
        <FilterChips
          size="sm"
          label={t.planner.disciplineFilter}
          items={DISCIPLINES.map((d) => ({
            key: d,
            label: t.discipline[d],
            color: `var(--${d})`,
          }))}
          active={active}
          onChange={setActive}
        />
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
          {(active.length > 0
            ? DISCIPLINES.filter((d) => active.includes(d))
            : DISCIPLINES
          ).map((d) => (
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
