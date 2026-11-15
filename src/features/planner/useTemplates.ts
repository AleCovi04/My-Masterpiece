import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore } from '../../data'
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
  }, [])

  const commit = useCallback((next: WorkoutTemplate[]) => {
    latest.current = next
    setData((d) => (d ? { ...d, templates: next } : d))
    void dataStore.saveTemplates(next)
  }, [])

  /** Crea o sostituisce (stesso id). */
  const save = useCallback(
    (template: WorkoutTemplate) => {
      const cur = latest.current
      commit(
        cur.some((t) => t.id === template.id)
          ? cur.map((t) => (t.id === template.id ? template : t))
          : [...cur, template],
      )
    },
    [commit],
  )

  const setArchived = useCallback(
    (id: Id, archived: boolean) =>
      commit(
        latest.current.map((t) =>
          t.id === id
            ? { ...t, archived, updatedAt: new Date().toISOString() }
            : t,
        ),
      ),
    [commit],
  )

  const duplicate = useCallback(
    (id: Id, copySuffix: string) => {
      const src = latest.current.find((t) => t.id === id)
      if (!src) return
      const now = new Date().toISOString()
      commit([
        ...latest.current,
        {
          ...structuredClone(src),
          id: newId(),
          name: `${src.name} ${copySuffix}`,
          archived: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
    },
    [commit],
  )

  const remove = useCallback(
    (id: Id) => commit(latest.current.filter((t) => t.id !== id)),
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
