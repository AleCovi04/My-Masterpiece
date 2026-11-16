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
  type WorkoutTemplate,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { normalizeName } from '../../lib/exercises'
import { formatDuration } from '../../lib/format'
import {
  formatDist,
  formatIntensity,
  structureSummary,
  templateDurationSec,
  templateTotals,
} from '../../lib/enduranceTemplate'
import { topMuscles } from '../../lib/templates'
import EnduranceDialog from './EnduranceDialog'
import Modal from './Modal'
import TemplateDialog from './TemplateDialog'
import { useTemplates } from './useTemplates'

const DISCIPLINES: Discipline[] = ['strength', 'run', 'bike', 'swim']

export default function WorkoutsTab() {
  const { t, lang } = useI18n()
  const p = t.planner
  const { templates, exercises, save, setArchived, duplicate, remove } =
    useTemplates()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<Set<Discipline>>(
    () => new Set(DISCIPLINES),
  )
  const [showArchived, setShowArchived] = useState(false)
  // `undefined` = chiuso, `'new'` = scelta disciplina, `{ discipline }` = nuovo, altrimenti id da modificare
  const [editing, setEditing] = useState<
    string | { discipline: Discipline } | undefined
  >(undefined)

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
    typeof editing === 'string' && editing !== 'new'
      ? (templates.find((w) => w.id === editing) ?? null)
      : null

  const newWorkout = () => {
    // con un solo filtro attivo la disciplina è ovvia
    if (active.size === 1) setEditing({ discipline: [...active][0] })
    else setEditing('new')
  }

  const toggle = (d: Discipline) => {
    if (active.has(d) && active.size === 1) return // almeno una attiva
    const next = new Set(active)
    if (!next.delete(d)) next.add(d)
    setActive(next)
  }

  const editorDiscipline =
    current?.discipline ??
    (typeof editing === 'object' ? editing.discipline : null)
  const closeEditor = () => setEditing(undefined)
  const onSave = (w: WorkoutTemplate) => {
    save(w)
    closeEditor()
  }
  const footer = {
    onDuplicate: () => {
      if (current) duplicate(current.id, p.copySuffix)
      closeEditor()
    },
    onArchive: (archived: boolean) => {
      if (current) setArchived(current.id, archived)
      closeEditor()
    },
    onDelete: () => {
      if (current) remove(current.id)
      closeEditor()
    },
    onClose: closeEditor,
  }
  let editor = null
  if (editorDiscipline === 'strength') {
    editor = (
      <TemplateDialog
        key={current?.id ?? 'new'}
        template={current?.discipline === 'strength' ? current : null}
        exercises={exercises}
        onSave={onSave}
        {...footer}
      />
    )
  } else if (editorDiscipline) {
    editor = (
      <EnduranceDialog
        key={current?.id ?? 'new'}
        discipline={editorDiscipline}
        template={current && current.discipline !== 'strength' ? current : null}
        onSave={onSave}
        {...footer}
      />
    )
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
          onClick={newWorkout}
        >
          + {p.newWorkout}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="ph">{p.emptyWorkouts}</div>
      ) : (
        <ul className="pl-list">
          {visible.map((w) => {
            const muscles =
              w.discipline === 'strength' ? topMuscles(w, exercises) : []
            const seconds = templateDurationSec(w)
            let meta: string
            let summary = ''
            if (w.discipline === 'strength') {
              meta = `${w.entries.length} ${p.exercisesCount}`
              if (seconds) meta += ` · ${formatDuration(seconds)}`
            } else {
              const totals = templateTotals(w)
              meta = [
                totals.distanceM !== null &&
                  `${totals.distanceComplete ? '' : '≥ '}${formatDist(totals.distanceM, w.discipline)}`,
                seconds &&
                  `${!w.estimatedDurationSec && !totals.durationComplete ? '≥ ' : ''}${formatDuration(seconds)}`,
              ]
                .filter(Boolean)
                .join(' · ')
              if (w.mode === 'structured') {
                summary = structureSummary(w.items ?? [], w.discipline, {
                  warmup: p.stepShort.warmup,
                  recovery: p.stepShort.recovery,
                  cooldown: p.stepShort.cooldown,
                })
              } else if (w.simple?.intensity !== undefined) {
                summary = `@ ${formatIntensity(w.simple.intensity, w.discipline)}`
              }
            }
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
                  {meta && <span className="wk-meta">{meta}</span>}
                  {summary && <span className="wk-sum">{summary}</span>}
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

      {editing === 'new' && (
        <Modal
          title={p.chooseDiscipline}
          closeLabel={p.close}
          onClose={() => setEditing(undefined)}
        >
          <div className="pl-choose">
            {DISCIPLINES.map((d) => (
              <button
                key={d}
                type="button"
                className="pl-choose-btn"
                data-discipline={d}
                onClick={() => setEditing({ discipline: d })}
              >
                <span className="wk-ic">
                  <DisciplineIcon discipline={d} />
                </span>
                {t.discipline[d]}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {editor}
    </>
  )
}
