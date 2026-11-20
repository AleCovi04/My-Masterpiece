import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore, useDataRevision } from '../../data'
import type {
  BlockApplication,
  Exercise,
  Id,
  Phase,
  Session,
  TrainingBlock,
  WorkoutTemplate,
} from '../../data/types'
import {
  deleteBlock as withoutBlock,
  planApplication,
  removeApplication,
  type ApplyInput,
  type ApplyResult,
} from '../../lib/blocks'
import { newId } from '../../lib/ids'

interface Loaded {
  blocks: TrainingBlock[]
  phases: Phase[]
  applications: BlockApplication[]
  templates: WorkoutTemplate[]
  exercises: Exercise[]
  sessions: Session[]
}

type Archivable = { id: Id; name: string; archived: boolean; updatedAt: string }

/** Crea o sostituisce (stesso id). */
const upsert = <T extends { id: Id }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item]

const archived = <T extends Archivable>(list: T[], id: Id, value: boolean) =>
  list.map((x) =>
    x.id === id
      ? { ...x, archived: value, updatedAt: new Date().toISOString() }
      : x,
  )

function copyOf<T extends Archivable & { createdAt: string }>(
  src: T,
  suffix: string,
): T {
  const now = new Date().toISOString()
  return {
    ...structuredClone(src),
    id: newId(),
    name: `${src.name} ${suffix}`,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Blocchi, fasi e loro applicazioni al calendario, con template ed esercizi
 * che servono a mostrarli. Tutto passa da `dataStore`.
 */
export function usePlanning() {
  const [data, setData] = useState<Loaded | null>(null)
  const latest = useRef<Loaded | null>(null)

  const revision = useDataRevision()
  useEffect(() => {
    let cancelled = false
    Promise.all([
      dataStore.loadBlocks(),
      dataStore.loadPhases(),
      dataStore.loadApplications(),
      dataStore.loadTemplates(),
      dataStore.loadExercises(),
      dataStore.loadSessions(),
    ]).then(
      ([blocks, phases, applications, templates, exercises, sessions]) => {
        if (cancelled) return
        const d = {
          blocks,
          phases,
          applications,
          templates,
          exercises,
          sessions,
        }
        latest.current = d
        setData(d)
      },
    )
    return () => {
      cancelled = true
    }
  }, [revision])

  const update = useCallback((patch: Partial<Loaded>) => {
    const cur = latest.current
    if (!cur) return null
    const next = { ...cur, ...patch }
    latest.current = next
    setData(next)
    return next
  }, [])

  /**
   * Modifica a schermo e, la stessa, su blocchi e fasi come sono adesso nel
   * salvataggio (in una sola transazione).
   */
  const commit = useCallback(
    (fn: (cur: Pick<Loaded, 'blocks' | 'phases'>) => Partial<Loaded>) => {
      const cur = latest.current
      if (!cur) return
      update(fn(cur))
      void dataStore.update(['blocks', 'phases'], fn)
    },
    [update],
  )

  // ---------- blocchi ----------

  const saveBlock = useCallback(
    (b: TrainingBlock) => commit((c) => ({ blocks: upsert(c.blocks, b) })),
    [commit],
  )
  const setBlockArchived = useCallback(
    (id: Id, value: boolean) =>
      commit((c) => ({ blocks: archived(c.blocks, id, value) })),
    [commit],
  )
  const duplicateBlock = useCallback(
    (id: Id, suffix: string) => {
      const src = latest.current?.blocks.find((b) => b.id === id)
      if (!src) return
      const copy = copyOf(src, suffix)
      commit((c) => ({ blocks: [...c.blocks, copy] }))
    },
    [commit],
  )

  /** Elimina per sempre il blocco e lo toglie dalle fasi che lo usano. */
  const deleteBlock = useCallback(
    (id: Id) => commit((c) => withoutBlock(c.blocks, c.phases, id)),
    [commit],
  )

  // ---------- fasi ----------

  const savePhase = useCallback(
    (p: Phase) => commit((c) => ({ phases: upsert(c.phases, p) })),
    [commit],
  )
  const setPhaseArchived = useCallback(
    (id: Id, value: boolean) =>
      commit((c) => ({ phases: archived(c.phases, id, value) })),
    [commit],
  )
  const duplicatePhase = useCallback(
    (id: Id, suffix: string) => {
      const src = latest.current?.phases.find((p) => p.id === id)
      if (!src) return
      const copy = copyOf(src, suffix)
      commit((c) => ({ phases: [...c.phases, copy] }))
    },
    [commit],
  )

  const deletePhase = useCallback(
    (id: Id) =>
      commit((c) => ({ phases: c.phases.filter((p) => p.id !== id) })),
    [commit],
  )

  // ---------- applicazioni ----------

  /** Applica al calendario e salva sedute e applicazione insieme. */
  const apply = useCallback(
    async (input: ApplyInput): Promise<ApplyResult | null> => {
      const cur = latest.current
      if (!cur) return null
      let r: ApplyResult | null = null
      // sulle sedute come sono adesso nel salvataggio (il Calendario potrebbe averle cambiate)
      const saved = await dataStore.update(
        ['sessions', 'applications'],
        (d) => {
          const out = planApplication(input, d.sessions, cur.templates)
          r = out
          return {
            sessions: out.sessions,
            applications: [...d.applications, out.application],
          }
        },
      )
      if (!saved) return null
      update(saved)
      return r
    },
    [update],
  )

  /** Toglie l'applicazione e le sue sedute ancora programmate. */
  const unapply = useCallback(
    async (appId: Id) => {
      let removed = 0
      const saved = await dataStore.update(
        ['sessions', 'applications'],
        (d) => {
          const r = removeApplication(d.sessions, d.applications, appId)
          removed = r.removed
          return r
        },
      )
      if (!saved) return 0
      update(saved)
      return removed
    },
    [update],
  )

  return {
    loading: data === null,
    blocks: data?.blocks ?? [],
    phases: data?.phases ?? [],
    applications: data?.applications ?? [],
    templates: data?.templates ?? [],
    exercises: data?.exercises ?? [],
    sessions: data?.sessions ?? [],
    saveBlock,
    setBlockArchived,
    duplicateBlock,
    deleteBlock,
    savePhase,
    setPhaseArchived,
    duplicatePhase,
    deletePhase,
    apply,
    unapply,
  }
}
