import type {
  ActualExercise,
  ActualSet,
  Exercise,
  Id,
  IsoDate,
  MuscleId,
  Session,
} from '../data/types'
import { MUSCLES } from '../data/types'

export const setVolume = (s: Pick<ActualSet, 'kg' | 'reps'>): number =>
  s.kg * s.reps

export const totalVolume = (sets: Pick<ActualSet, 'kg' | 'reps'>[]): number =>
  sets.reduce((sum, s) => sum + setVolume(s), 0)

export interface PersonalRecords {
  maxKg?: { kg: number; reps: number; date: IsoDate }
  bestSet?: { kg: number; reps: number; volume: number; date: IsoDate }
}

function doneStrength(sessions: Session[]) {
  return sessions.flatMap((s) =>
    s.status === 'done' && s.discipline === 'strength' && s.actual
      ? [{ date: s.date, order: s.order, actual: s.actual }]
      : [],
  )
}

/** PR di un esercizio: kg massimo e miglior serie (kg × rip). Solo sedute concluse. */
export function personalRecords(
  exerciseId: Id,
  sessions: Session[],
): PersonalRecords {
  const pr: PersonalRecords = {}
  for (const { date, actual } of doneStrength(sessions)) {
    for (const ex of actual.exercises) {
      if (ex.exerciseId !== exerciseId || ex.skipped) continue
      for (const s of ex.sets) {
        const volume = setVolume(s)
        if (!pr.maxKg || s.kg > pr.maxKg.kg) {
          pr.maxKg = { kg: s.kg, reps: s.reps, date }
        }
        if (!pr.bestSet || volume > pr.bestSet.volume) {
          pr.bestSet = { kg: s.kg, reps: s.reps, volume, date }
        }
      }
    }
  }
  return pr
}

/** Serie dell'ultima seduta conclusa in cui l'esercizio è stato eseguito. */
export function lastPerformance(
  exerciseId: Id,
  sessions: Session[],
): ActualSet[] | undefined {
  const sorted = doneStrength(sessions).sort(
    (a, b) => a.date.localeCompare(b.date) || a.order - b.order,
  )
  for (let i = sorted.length - 1; i >= 0; i--) {
    const ex = sorted[i].actual.exercises.find(
      (e) => e.exerciseId === exerciseId && !e.skipped && e.sets.length > 0,
    )
    if (ex) return ex.sets
  }
  return undefined
}

/**
 * Valori "dell'ultima volta" per la serie `setIndex` (da 0) di un esercizio:
 * la seduta conclusa più recente, di qualsiasi allenamento, in cui
 * quell'esercizio ha quella serie. Sono i valori in grigio della registrazione dal vivo.
 */
export function previousSet(
  exerciseId: Id,
  setIndex: number,
  sessions: Session[],
): Pick<ActualSet, 'kg' | 'reps'> | undefined {
  const sorted = doneStrength(sessions).sort(
    (a, b) => a.date.localeCompare(b.date) || a.order - b.order,
  )
  for (let i = sorted.length - 1; i >= 0; i--) {
    for (const ex of sorted[i].actual.exercises) {
      const set = ex.sets[setIndex]
      if (ex.exerciseId === exerciseId && !ex.skipped && set) {
        return { kg: set.kg, reps: set.reps }
      }
    }
  }
  return undefined
}

/** Serie per muscolo = serie completate × percentuale / 100 (mappa di calore). */
export function setsPerMuscle(
  performed: ActualExercise[],
  exercises: Pick<Exercise, 'id' | 'muscles'>[],
): Record<MuscleId, number> {
  const result = Object.fromEntries(MUSCLES.map((m) => [m.id, 0])) as Record<
    MuscleId,
    number
  >
  const byId = new Map(exercises.map((e) => [e.id, e]))
  for (const pe of performed) {
    if (pe.skipped) continue
    const ex = byId.get(pe.exerciseId)
    if (!ex) continue
    for (const m of ex.muscles) {
      result[m.muscle] += (pe.sets.length * m.percent) / 100
    }
  }
  return result
}
