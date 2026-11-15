import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore } from '../../data'
import type { Exercise, Id, Session, WorkoutTemplate } from '../../data/types'
import { exerciseUsage, type ExerciseUsage } from '../../lib/exercises'

interface Loaded {
  exercises: Exercise[]
  templates: WorkoutTemplate[]
  sessions: Session[]
}

/** Catalogo esercizi: tutto il salvataggio passa da `dataStore`. */
export function useExercises() {
  const [data, setData] = useState<Loaded | null>(null)
  const latest = useRef<Exercise[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      dataStore.loadExercises(),
      dataStore.loadTemplates(),
      dataStore.loadSessions(),
    ]).then(([exercises, templates, sessions]) => {
      if (cancelled) return
      latest.current = exercises
      setData({ exercises, templates, sessions })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const commit = useCallback((next: Exercise[]) => {
    latest.current = next
    setData((d) => (d ? { ...d, exercises: next } : d))
    void dataStore.saveExercises(next)
  }, [])

  /** Crea o sostituisce (stesso id). */
  const save = useCallback(
    (exercise: Exercise) => {
      const cur = latest.current
      commit(
        cur.some((e) => e.id === exercise.id)
          ? cur.map((e) => (e.id === exercise.id ? exercise : e))
          : [...cur, exercise],
      )
    },
    [commit],
  )

  const setArchived = useCallback(
    (id: Id, archived: boolean) =>
      commit(
        latest.current.map((e) =>
          e.id === id
            ? { ...e, archived, updatedAt: new Date().toISOString() }
            : e,
        ),
      ),
    [commit],
  )

  const usageOf = useCallback(
    (id: Id): ExerciseUsage =>
      data
        ? exerciseUsage(id, data.templates, data.sessions)
        : { templates: 0, sessions: 0 },
    [data],
  )

  /** Elimina solo se non è usato da nulla; restituisce se l'ha fatto. */
  const remove = useCallback(
    (id: Id): boolean => {
      const u = usageOf(id)
      if (u.templates > 0 || u.sessions > 0) return false
      commit(latest.current.filter((e) => e.id !== id))
      return true
    },
    [commit, usageOf],
  )

  return {
    exercises: data?.exercises ?? null,
    save,
    setArchived,
    remove,
    usageOf,
  }
}
