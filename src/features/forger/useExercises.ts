import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore, useDataRevision } from '../../data'
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

  const revision = useDataRevision()
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
  }, [revision])

  /** Modifica a schermo e, la stessa, sul catalogo com'è adesso nel salvataggio. */
  const commit = useCallback((fn: (cur: Exercise[]) => Exercise[]) => {
    const next = fn(latest.current)
    latest.current = next
    setData((d) => (d ? { ...d, exercises: next } : d))
    void dataStore.update(['exercises'], (d) => ({
      exercises: fn(d.exercises),
    }))
  }, [])

  /** Crea o sostituisce (stesso id). */
  const save = useCallback(
    (exercise: Exercise) =>
      commit((cur) =>
        cur.some((e) => e.id === exercise.id)
          ? cur.map((e) => (e.id === exercise.id ? exercise : e))
          : [...cur, exercise],
      ),
    [commit],
  )

  const setArchived = useCallback(
    (id: Id, archived: boolean) => {
      const now = new Date().toISOString()
      commit((cur) =>
        cur.map((e) => (e.id === id ? { ...e, archived, updatedAt: now } : e)),
      )
    },
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
      commit((cur) => cur.filter((e) => e.id !== id))
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
