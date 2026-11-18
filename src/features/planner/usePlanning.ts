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

  // ---------- blocchi ----------

  const saveBlocks = useCallback(
    (blocks: TrainingBlock[]) => {
      update({ blocks })
      void dataStore.saveBlocks(blocks)
    },
    [update],
  )
  const saveBlock = useCallback(
    (b: TrainingBlock) => saveBlocks(upsert(latest.current?.blocks ?? [], b)),
    [saveBlocks],
  )
  const setBlockArchived = useCallback(
    (id: Id, value: boolean) =>
      saveBlocks(archived(latest.current?.blocks ?? [], id, value)),
    [saveBlocks],
  )
  const duplicateBlock = useCallback(
    (id: Id, suffix: string) => {
      const list = latest.current?.blocks ?? []
      const src = list.find((b) => b.id === id)
      if (src) saveBlocks([...list, copyOf(src, suffix)])
    },
    [saveBlocks],
  )

  /** Elimina per sempre il blocco e lo toglie dalle fasi che lo usano. */
  const deleteBlock = useCallback(
    (id: Id) => {
      const cur = latest.current
      if (!cur) return
      const r = withoutBlock(cur.blocks, cur.phases, id)
      update({ blocks: r.blocks, phases: r.phases })
      void dataStore.saveBlocks(r.blocks)
      void dataStore.savePhases(r.phases)
    },
    [update],
  )

  // ---------- fasi ----------

  const savePhases = useCallback(
    (phases: Phase[]) => {
      update({ phases })
      void dataStore.savePhases(phases)
    },
    [update],
  )
  const savePhase = useCallback(
    (p: Phase) => savePhases(upsert(latest.current?.phases ?? [], p)),
    [savePhases],
  )
  const setPhaseArchived = useCallback(
    (id: Id, value: boolean) =>
      savePhases(archived(latest.current?.phases ?? [], id, value)),
    [savePhases],
  )
  const duplicatePhase = useCallback(
    (id: Id, suffix: string) => {
      const list = latest.current?.phases ?? []
      const src = list.find((p) => p.id === id)
      if (src) savePhases([...list, copyOf(src, suffix)])
    },
    [savePhases],
  )

  const deletePhase = useCallback(
    (id: Id) =>
      savePhases((latest.current?.phases ?? []).filter((p) => p.id !== id)),
    [savePhases],
  )

  // ---------- applicazioni ----------

  /** Applica al calendario e salva sedute e applicazione insieme. */
  const apply = useCallback(
    async (input: ApplyInput): Promise<ApplyResult | null> => {
      const cur = latest.current
      if (!cur) return null
      // le sedute si rileggono: il Calendario potrebbe averle cambiate
      const sessions = await dataStore.loadSessions()
      const r = planApplication(input, sessions, cur.templates)
      const applications = [...cur.applications, r.application]
      await dataStore.saveSessionsAndApplications(r.sessions, applications)
      update({ sessions: r.sessions, applications })
      return r
    },
    [update],
  )

  /** Toglie l'applicazione e le sue sedute ancora programmate. */
  const unapply = useCallback(
    async (appId: Id) => {
      const cur = latest.current
      if (!cur) return 0
      const sessions = await dataStore.loadSessions()
      const r = removeApplication(sessions, cur.applications, appId)
      await dataStore.saveSessionsAndApplications(r.sessions, r.applications)
      update({ sessions: r.sessions, applications: r.applications })
      return r.removed
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
