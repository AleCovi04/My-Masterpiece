import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore, useDataRevision } from '../../data'
import type { Exercise, Id, WorkoutTemplate } from '../../data/types'
import { newId } from '../../lib/ids'

interface Loaded {
  templates: WorkoutTemplate[]
  exercises: Exercise[]
}

/** Allenamenti salvati: tutto il salvataggio passa da `dataStore`. */
export function useTemplates() {
  const [data, setData] = useState<Loaded | null>(null)
  const latest = useRef<WorkoutTemplate[]>([])

  const revision = useDataRevision()
  useEffect(() => {
    let cancelled = false
    Promise.all([dataStore.loadTemplates(), dataStore.loadExercises()]).then(
      ([templates, exercises]) => {
        if (cancelled) return
        latest.current = templates
        setData({ templates, exercises })
      },
    )
    return () => {
      cancelled = true
    }
  }, [revision])

  /** Modifica a schermo e, la stessa, sugli allenamenti come sono adesso nel salvataggio. */
  const commit = useCallback(
    (fn: (cur: WorkoutTemplate[]) => WorkoutTemplate[]) => {
      const next = fn(latest.current)
      latest.current = next
      setData((d) => (d ? { ...d, templates: next } : d))
      void dataStore.update(['templates'], (d) => ({
        templates: fn(d.templates),
      }))
    },
    [],
  )

  /** Crea o sostituisce (stesso id). */
  const save = useCallback(
    (template: WorkoutTemplate) =>
      commit((cur) =>
        cur.some((t) => t.id === template.id)
          ? cur.map((t) => (t.id === template.id ? template : t))
          : [...cur, template],
      ),
    [commit],
  )

  const setArchived = useCallback(
    (id: Id, archived: boolean) => {
      const now = new Date().toISOString()
      commit((cur) =>
        cur.map((t) => (t.id === id ? { ...t, archived, updatedAt: now } : t)),
      )
    },
    [commit],
  )

  const duplicate = useCallback(
    (id: Id, copySuffix: string) => {
      const src = latest.current.find((t) => t.id === id)
      if (!src) return
      const now = new Date().toISOString()
      const copy: WorkoutTemplate = {
        ...structuredClone(src),
        id: newId(),
        name: `${src.name} ${copySuffix}`,
        archived: false,
        createdAt: now,
        updatedAt: now,
      }
      commit((cur) => [...cur, copy])
    },
    [commit],
  )

  const remove = useCallback(
    (id: Id) => commit((cur) => cur.filter((t) => t.id !== id)),
    [commit],
  )

  return {
    templates: data?.templates ?? null,
    exercises: data?.exercises ?? null,
    save,
    setArchived,
    duplicate,
    remove,
  }
}
