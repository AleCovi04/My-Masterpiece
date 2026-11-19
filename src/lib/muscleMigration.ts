import { MUSCLES, type Exercise, type MuscleId } from '../data/types'

// Vecchi nomi/id dei 15 gruppi → i 20 attuali. Gli id attuali valgono come sono.
const LEGACY: Record<string, MuscleId> = {
  petto: 'chest',
  'deltoidi anteriori': 'front_delts',
  'deltoidi laterali': 'side_delts',
  'deltoidi posteriori': 'rear_delts',
  bicipiti: 'biceps',
  tricipiti: 'triceps',
  dorsali: 'lats',
  'schiena media': 'mid_back',
  'schiena media (trapezio/romboidi)': 'mid_back',
  quadricipiti: 'quads',
  addominali: 'abs',
  lombari: 'lower_back',
  glutei: 'glutes',
  femorali: 'hamstrings',
  polpacci: 'calves',
  avambracci: 'forearms',
}

const VALID = new Set<string>(MUSCLES.map((m) => m.id))

function migrateMuscleId(raw: unknown): MuscleId | null {
  if (typeof raw !== 'string') return null
  if (VALID.has(raw)) return raw as MuscleId
  return LEGACY[raw.trim().toLocaleLowerCase()] ?? null
}

/** Converte i muscoli di un esercizio; voci che finiscono sullo stesso gruppo: vale la % più alta. */
export function migrateExercise(e: Exercise): Exercise {
  const byId = new Map<MuscleId, number>()
  for (const m of Array.isArray(e.muscles) ? e.muscles : []) {
    const id = migrateMuscleId(m?.muscle)
    if (!id) continue
    byId.set(id, Math.max(byId.get(id) ?? 0, m.percent))
  }
  return {
    ...e,
    muscles: [...byId].map(([muscle, percent]) => ({ muscle, percent })),
  }
}
