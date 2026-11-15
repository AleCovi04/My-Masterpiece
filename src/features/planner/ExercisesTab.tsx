import { useMemo, useState } from 'react'
import { MUSCLES, type Exercise, type MuscleId } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  formatMmSs,
  involvesMuscle,
  normalizeName,
  sortedMuscles,
} from '../../lib/exercises'
import ExerciseDialog from './ExerciseDialog'
import { useExercises } from './useExercises'

const MAX_SHOWN = 3

export default function ExercisesTab() {
  const { t, lang } = useI18n()
  const p = t.planner
  const { exercises, save, setArchived, remove, usageOf } = useExercises()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleId | ''>('')
  const [showArchived, setShowArchived] = useState(false)
  // `undefined` = chiuso, `null` = nuovo, altrimenti id da modificare
  const [editing, setEditing] = useState<string | null | undefined>(undefined)

  const label = (id: MuscleId) => MUSCLES.find((m) => m.id === id)?.[lang] ?? id

  const visible = useMemo(() => {
    const q = normalizeName(query)
    return (exercises ?? [])
      .filter(
        (e) =>
          (showArchived || !e.archived) &&
          (!q || normalizeName(e.name).includes(q)) &&
          (!muscle || involvesMuscle(e, muscle)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, lang))
  }, [exercises, query, muscle, showArchived, lang])

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
        <select
          className="pl-inp pl-select"
          aria-label={p.muscleFilter}
          value={muscle}
          onChange={(e) => setMuscle(e.target.value as MuscleId | '')}
        >
          <option value="">{p.allMuscles}</option>
          {MUSCLES.map((m) => (
            <option key={m.id} value={m.id}>
              {m[lang]}
            </option>
          ))}
        </select>
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

      {visible.length === 0 ? (
        <div className="ph">{p.empty}</div>
      ) : (
        <ul className="pl-list">
          {visible.map((e) => {
            const ms = sortedMuscles(e)
            return (
              <li key={e.id} className={`pl-item${e.archived ? ' arch' : ''}`}>
                <button
                  type="button"
                  className="pl-item-main"
                  onClick={() => setEditing(e.id)}
                >
                  <b>
                    {e.name}
                    {e.archived && (
                      <span className="pl-tag">{p.archivedTag}</span>
                    )}
                  </b>
                  <span className="pl-ms">
                    {ms
                      .slice(0, MAX_SHOWN)
                      .map((m) => `${label(m.muscle)} ${m.percent}%`)
                      .join(' · ')}
                    {ms.length > MAX_SHOWN &&
                      ` · +${ms.length - MAX_SHOWN} ${p.moreMuscles}`}
                  </span>
                  <span className="pl-rest">
                    {p.rest} {formatMmSs(e.defaultRestSeconds)}
                  </span>
                </button>
                <button
                  type="button"
                  className="pl-btn pl-small"
                  onClick={() => setArchived(e.id, !e.archived)}
                >
                  {e.archived ? p.restore : p.archive}
                </button>
              </li>
            )
          })}
        </ul>
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
