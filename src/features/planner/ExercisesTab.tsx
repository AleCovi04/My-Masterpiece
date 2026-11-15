import { useMemo, useState } from 'react'
import { MUSCLES, type Exercise, type MuscleId } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  filterByMuscles,
  formatMmSs,
  normalizeName,
  sortedMuscles,
} from '../../lib/exercises'
import { ArchiveIcon, RestoreIcon } from '../../components/ui/Icons'
import ExerciseDialog from './ExerciseDialog'
import MuscleBars from './MuscleBars'
import MuscleFilterDialog from './MuscleFilterDialog'
import { useExercises } from './useExercises'

export default function ExercisesTab() {
  const { t, lang } = useI18n()
  const p = t.planner
  const { exercises, save, setArchived, remove, usageOf } = useExercises()
  const [query, setQuery] = useState('')
  const [muscles, setMuscles] = useState<MuscleId[]>([])
  const [choosing, setChoosing] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  // `undefined` = chiuso, `null` = nuovo, altrimenti id da modificare
  const [editing, setEditing] = useState<string | null | undefined>(undefined)

  const label = (id: MuscleId) => MUSCLES.find((m) => m.id === id)?.[lang] ?? id

  // Ricerca e archiviati sempre; poi, se ci sono muscoli scelti, le due sezioni.
  const { list, sections } = useMemo(() => {
    const q = normalizeName(query)
    const base = (exercises ?? []).filter(
      (e) =>
        (showArchived || !e.archived) &&
        (!q || normalizeName(e.name).includes(q)),
    )
    if (muscles.length > 0) {
      return { list: [], sections: filterByMuscles(base, muscles, lang) }
    }
    return {
      list: base.sort((a, b) => a.name.localeCompare(b.name, lang)),
      sections: null,
    }
  }, [exercises, query, muscles, showArchived, lang])

  const total = sections
    ? sections.primary.length + sections.secondary.length
    : list.length

  const renderItem = (e: Exercise) => (
    <li key={e.id} className={`pl-item${e.archived ? ' arch' : ''}`}>
      <button
        type="button"
        className="pl-item-main"
        onClick={() => setEditing(e.id)}
      >
        <span className="pl-item-info">
          <b>
            {e.name}
            {e.archived && <span className="pl-tag">{p.archivedTag}</span>}
          </b>
          <span className="pl-rest">
            {p.rest} {formatMmSs(e.defaultRestSeconds)}
          </span>
        </span>
        <MuscleBars muscles={sortedMuscles(e)} highlight={muscles} />
      </button>
      <button
        type="button"
        className="pl-ico"
        title={e.archived ? p.restore : p.archive}
        aria-label={`${e.archived ? p.restore : p.archive}: ${e.name}`}
        onClick={() => setArchived(e.id, !e.archived)}
      >
        {e.archived ? <RestoreIcon /> : <ArchiveIcon />}
      </button>
    </li>
  )

  if (!exercises) return null
  const current: Exercise | null =
    typeof editing === 'string'
      ? (exercises.find((e) => e.id === editing) ?? null)
      : null

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
        <span className={`pl-mf${muscles.length > 0 ? ' on' : ''}`}>
          <button
            type="button"
            className="pl-mf-btn"
            aria-label={p.muscleFilter}
            onClick={() => setChoosing(true)}
          >
            {muscles.length > 0
              ? muscles.map((id) => label(id)).join(', ')
              : p.chooseMuscle}
          </button>
          {muscles.length > 0 && (
            <button
              type="button"
              className="pl-mf-x"
              aria-label={p.clearMuscles}
              onClick={() => setMuscles([])}
            >
              ✕
            </button>
          )}
        </span>
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
          + {p.newExercise}
        </button>
      </div>

      {total === 0 ? (
        <div className="ph">{p.empty}</div>
      ) : sections ? (
        (
          [
            ['primary', p.sectionPrimary],
            ['secondary', p.sectionSecondary],
          ] as const
        ).map(([key, title]) =>
          sections[key].length > 0 ? (
            <section key={key} className="pl-sec">
              <h3 className="pl-sec-h">
                {title} <span>{sections[key].length}</span>
              </h3>
              <ul className="pl-list">
                {sections[key].map((m) => renderItem(m.exercise))}
              </ul>
            </section>
          ) : null,
        )
      ) : (
        <ul className="pl-list">{list.map(renderItem)}</ul>
      )}

      {choosing && (
        <MuscleFilterDialog
          selected={muscles}
          onApply={(next) => {
            setMuscles(next)
            setChoosing(false)
          }}
          onClose={() => setChoosing(false)}
        />
      )}

      {editing !== undefined && (editing === null || current) && (
        <ExerciseDialog
          exercise={current}
          all={exercises}
          usage={current ? usageOf(current.id) : { templates: 0, sessions: 0 }}
          onSave={(e) => {
            save(e)
            setEditing(undefined)
          }}
          onArchive={(archived) => {
            if (current) setArchived(current.id, archived)
            setEditing(undefined)
          }}
          onDelete={() => {
            if (current && remove(current.id)) setEditing(undefined)
          }}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  )
}
