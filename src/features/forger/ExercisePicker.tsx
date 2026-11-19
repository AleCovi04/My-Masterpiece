import { useMemo, useState } from 'react'
import {
  MUSCLES,
  type Exercise,
  type Id,
  type MuscleId,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  filterByMuscles,
  normalizeName,
  sortedMuscles,
} from '../../lib/exercises'
import Modal from '../../components/ui/Modal'
import MuscleFilterDialog from './MuscleFilterDialog'

interface Props {
  exercises: Exercise[]
  onAdd: (ids: Id[]) => void
  onClose: () => void
}

/** Scelta (anche multipla) di esercizi dal catalogo, con ricerca e filtro muscolo. */
export default function ExercisePicker({ exercises, onAdd, onClose }: Props) {
  const { t, lang } = useI18n()
  const p = t.planner
  const [query, setQuery] = useState('')
  const [muscles, setMuscles] = useState<MuscleId[]>([])
  const [choosing, setChoosing] = useState(false)
  const [picked, setPicked] = useState<Id[]>([])

  const label = (id: MuscleId) => MUSCLES.find((m) => m.id === id)?.[lang] ?? id

  const list = useMemo(() => {
    const q = normalizeName(query)
    const base = exercises.filter(
      (e) => !e.archived && (!q || normalizeName(e.name).includes(q)),
    )
    if (muscles.length === 0) {
      return base.sort((a, b) => a.name.localeCompare(b.name, lang))
    }
    const s = filterByMuscles(base, muscles, lang)
    return [...s.primary, ...s.secondary].map((m) => m.exercise)
  }, [exercises, query, muscles, lang])

  const toggle = (id: Id) =>
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    )

  return (
    <>
      <Modal title={p.addExercise} closeLabel={p.close} onClose={onClose}>
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
                ? muscles.map(label).join(', ')
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
        </div>

        {list.length === 0 ? (
          <div className="ph">{p.empty}</div>
        ) : (
          <ul className="pl-pick">
            {list.map((e) => {
              const on = picked.includes(e.id)
              return (
                <li key={e.id}>
                  <label className={`pl-pick-row${on ? ' on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(e.id)}
                    />
                    <span className="pl-pick-tx">
                      <b>{e.name}</b>
                      <small>
                        {sortedMuscles(e)
                          .slice(0, 3)
                          .map((m) => `${label(m.muscle)} ${m.percent}%`)
                          .join(' · ')}
                      </small>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <div className="pl-actions">
          <button
            type="button"
            className="pl-btn acc"
            disabled={picked.length === 0}
            onClick={() => onAdd(picked)}
          >
            {p.addSelected}
            {picked.length > 0 ? ` (${picked.length})` : ''}
          </button>
          <button type="button" className="pl-btn" onClick={onClose}>
            {p.cancel}
          </button>
        </div>
      </Modal>
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
    </>
  )
}
