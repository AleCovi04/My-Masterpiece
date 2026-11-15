import { useMemo, useState } from 'react'
import {
  ArchiveIcon,
  DisciplineIcon,
  RestoreIcon,
} from '../../components/ui/Icons'
import {
  MUSCLES,
  type Discipline,
  type MuscleId,
  type StrengthTemplate,
  type WorkoutTemplate,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { normalizeName } from '../../lib/exercises'
import { formatDuration } from '../../lib/format'
import { topMuscles } from '../../lib/templates'
import TemplateDialog from './TemplateDialog'
import { useTemplates } from './useTemplates'

const DISCIPLINES: Discipline[] = ['strength', 'run', 'bike', 'swim']
/** Per ora solo la forza ha un editor; le altre si attivano con il loro tipo di template. */
const ENABLED: Discipline[] = ['strength']

export default function WorkoutsTab() {
  const { t, lang } = useI18n()
  const p = t.planner
  const { templates, exercises, save, setArchived, duplicate, remove } =
    useTemplates()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<Set<Discipline>>(() => new Set(ENABLED))
  const [showArchived, setShowArchived] = useState(false)
  // `undefined` = chiuso, `null` = nuovo, altrimenti id da modificare
  const [editing, setEditing] = useState<string | null | undefined>(undefined)

  const label = (id: MuscleId) => MUSCLES.find((m) => m.id === id)?.[lang] ?? id

  const visible = useMemo(() => {
    const q = normalizeName(query)
    return (templates ?? [])
      .filter(
        (w) =>
          active.has(w.discipline) &&
          (showArchived || !w.archived) &&
          (!q || normalizeName(w.name).includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, lang))
  }, [templates, query, active, showArchived, lang])

  if (!templates || !exercises) return null

  const current: WorkoutTemplate | null =
    typeof editing === 'string'
      ? (templates.find((w) => w.id === editing) ?? null)
      : null

  const toggle = (d: Discipline) => {
    if (!ENABLED.includes(d)) return
    if (active.has(d) && active.size === 1) return // almeno una attiva
    const next = new Set(active)
    if (!next.delete(d)) next.add(d)
    setActive(next)
  }

  return (
    <>
      <div className="pl-toolbar">
        <input
          type="search"
          className="pl-inp pl-search"
          placeholder={p.search}
          aria-label={p.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="pl-disc" role="group" aria-label={p.disciplineFilter}>
          {DISCIPLINES.map((d) => {
            const enabled = ENABLED.includes(d)
            return (
              <button
                key={d}
                type="button"
                className="pl-dchip"
                data-discipline={d}
                aria-pressed={active.has(d)}
                disabled={!enabled}
                title={enabled ? undefined : p.soon}
                onClick={() => toggle(d)}
              >
                <i />
                {t.discipline[d]}
              </button>
            )
          })}
        </div>
        <label className="pl-check">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          {p.showArchived}
        </label>
        <button
          type="button"
          className="pl-btn acc pl-new"
          onClick={() => setEditing(null)}
        >
          + {p.newWorkout}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="ph">{p.emptyWorkouts}</div>
      ) : (
        <ul className="pl-list">
          {visible.map((w) => {
            const muscles = topMuscles(w, exercises)
            return (
              <li
                key={w.id}
                className={`pl-item${w.archived ? ' arch' : ''}`}
                data-discipline={w.discipline}
              >
                <button
                  type="button"
                  className="pl-item-main"
                  onClick={() => setEditing(w.id)}
                >
                  <span className="wk-head">
                    <span className="wk-ic">
                      <DisciplineIcon discipline={w.discipline} />
                    </span>
                    <b className="pl-item-name">
                      {w.name}
                      {w.archived && (
                        <span className="pl-tag">{p.archivedTag}</span>
                      )}
                    </b>
                  </span>
                  <span className="wk-meta">
                    {w.entries.length} {p.exercisesCount}
                    {w.estimatedDurationSec
                      ? ` · ${formatDuration(w.estimatedDurationSec)}`
                      : ''}
                  </span>
                  {muscles.length > 0 && (
                    <span className="wk-chips">
                      {muscles.map((m) => (
                        <span key={m} className="wk-chip">
                          {label(m)}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="pl-ico"
                  title={w.archived ? p.restore : p.archive}
                  aria-label={`${w.archived ? p.restore : p.archive}: ${w.name}`}
                  onClick={() => setArchived(w.id, !w.archived)}
                >
                  {w.archived ? <RestoreIcon /> : <ArchiveIcon />}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {editing !== undefined && (editing === null || current) && (
        <TemplateDialog
          template={current as StrengthTemplate | null}
          exercises={exercises}
          onSave={(w) => {
            save(w)
            setEditing(undefined)
          }}
          onDuplicate={() => {
            if (current) duplicate(current.id, p.copySuffix)
            setEditing(undefined)
          }}
          onArchive={(archived) => {
            if (current) setArchived(current.id, archived)
            setEditing(undefined)
          }}
          onDelete={() => {
            if (current) remove(current.id)
            setEditing(undefined)
          }}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  )
}
