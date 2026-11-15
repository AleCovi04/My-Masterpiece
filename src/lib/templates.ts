import type {
  Exercise,
  Id,
  MuscleId,
  TemplateSet,
  WorkoutTemplate,
} from '../data/types'

/** Elemento che può far parte di una superserie. */
export interface Linked {
  supersetId?: string
}

export interface Block {
  /** Indice del primo elemento. */
  start: number
  /** Indice dopo l'ultimo elemento. */
  end: number
}

/** Blocchi di elementi consecutivi: una superserie è un blocco, gli altri hanno un solo elemento. */
export function blocks(items: Linked[]): Block[] {
  const out: Block[] = []
  let i = 0
  while (i < items.length) {
    const id = items[i].supersetId
    let j = i + 1
    if (id) while (j < items.length && items[j].supersetId === id) j++
    out.push({ start: i, end: j })
    i = j
  }
  return out
}

/** Una superserie ha sempre almeno due voci: gli id rimasti soli vengono tolti. */
export function normalizeSupersets<T extends Linked>(items: T[]): T[] {
  return blocks(items).flatMap(({ start, end }) =>
    items.slice(start, end).map((x) => {
      if (end - start > 1 || !x.supersetId) return x
      const { supersetId: _drop, ...rest } = x
      void _drop
      return rest as T
    }),
  )
}

/** "Superserie A/B…" in ordine di comparsa (id → lettera). */
export function supersetLabels(items: Linked[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const { start, end } of blocks(items)) {
    const id = items[start].supersetId
    if (id && end - start > 1) {
      map.set(id, String.fromCharCode(65 + (map.size % 26)))
    }
  }
  return map
}

/**
 * Sposta il blocco `from` in modo che finisca alla posizione `to` della lista
 * dei blocchi *senza* quello spostato (stessa convenzione di `moveSession`).
 */
export function moveBlock<T extends Linked>(
  items: T[],
  from: number,
  to: number,
): T[] {
  const bs = blocks(items).map((b) => items.slice(b.start, b.end))
  if (from < 0 || from >= bs.length) return items
  const [moved] = bs.splice(from, 1)
  const at = Math.max(0, Math.min(Math.trunc(to), bs.length))
  bs.splice(at, 0, moved)
  return bs.flat()
}

/** Unisce in una superserie il blocco di `index` con il blocco successivo. */
export function mergeWithNext<T extends Linked>(
  items: T[],
  index: number,
  newId: string,
): T[] {
  const bs = blocks(items)
  const bi = bs.findIndex((b) => index >= b.start && index < b.end)
  if (bi < 0 || bi === bs.length - 1) return items
  const cur = bs[bi]
  const next = bs[bi + 1]
  const id =
    items[cur.start].supersetId ?? items[next.start].supersetId ?? newId
  return items.map((x, i) =>
    i >= cur.start && i < next.end ? { ...x, supersetId: id } : x,
  )
}

/**
 * Toglie la voce `index` dalla sua superserie: se era in mezzo, il gruppo si
 * divide in due. I gruppi che restano di una sola voce si sciolgono.
 */
export function separate<T extends Linked>(
  items: T[],
  index: number,
  newId: string,
): T[] {
  const id = items[index]?.supersetId
  if (!id) return items
  const bs = blocks(items)
  const b = bs.find((x) => index >= x.start && index < x.end)
  if (!b) return items
  const next = items.map((x, i) => {
    if (i < b.start || i >= b.end) return x
    if (i === index) {
      const { supersetId: _drop, ...rest } = x
      void _drop
      return rest as T
    }
    return i > index ? { ...x, supersetId: newId } : x
  })
  return normalizeSupersets(next)
}

/** "N × reps @ kg, RIR" → N serie uguali. */
export function expandSets(
  n: number,
  reps: number,
  kg: number,
  rir: number,
): TemplateSet[] {
  return Array.from({ length: n }, () => ({ reps, kg, rir }))
}

/** "1:15" → 4500 s; `null` se non è h:mm valido (minuti 00–59). */
export function parseHm(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):([0-5]\d)$/)
  return m ? (Number(m[1]) * 60 + Number(m[2])) * 60 : null
}

/** I muscoli più coinvolti di un template: serie × % per muscolo, decrescente. */
export function topMuscles(
  template: Pick<WorkoutTemplate, 'entries'>,
  exercises: Pick<Exercise, 'id' | 'muscles'>[],
  limit = 4,
): MuscleId[] {
  const byId = new Map<Id, Pick<Exercise, 'id' | 'muscles'>>(
    exercises.map((e) => [e.id, e]),
  )
  const score = new Map<MuscleId, number>()
  for (const entry of template.entries) {
    const ex = byId.get(entry.exerciseId)
    if (!ex) continue
    for (const m of ex.muscles) {
      score.set(
        m.muscle,
        (score.get(m.muscle) ?? 0) + (entry.sets.length * m.percent) / 100,
      )
    }
  }
  return [...score]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}
