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

const setVolume = (s: Pick<ActualSet, 'kg' | 'reps'>): number => s.kg * s.reps

export const totalVolume = (sets: Pick<ActualSet, 'kg' | 'reps'>[]): number =>
  sets.reduce((sum, s) => sum + setVolume(s), 0)

interface PersonalRecords {
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
 * l'ultima seduta conclusa, di qualsiasi allenamento, in cui l'esercizio è
 * stato eseguito; se quella seduta non aveva la serie `setIndex`, nessun
 * valore (non si risale alle sedute precedenti). Sono i valori in grigio
 * della registrazione dal vivo.
 */
export function previousSet(
  exerciseId: Id,
  setIndex: number,
  sessions: Session[],
): Pick<ActualSet, 'kg' | 'reps'> | undefined {
  const set = lastPerformance(exerciseId, sessions)?.[setIndex]
  return set && { kg: set.kg, reps: set.reps }
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

// ---------- Analisi della forza ----------

/** Serie per muscolo (pesate per il coinvolgimento) in tutte le sedute di forza svolte. */
export function muscleSetsIn(
  sessions: Session[],
  exercises: Pick<Exercise, 'id' | 'muscles'>[],
): Record<MuscleId, number> {
  const total = Object.fromEntries(MUSCLES.map((m) => [m.id, 0])) as Record<
    MuscleId,
    number
  >
  for (const { actual } of doneStrength(sessions)) {
    const per = setsPerMuscle(actual.exercises, exercises)
    for (const m of MUSCLES) total[m.id] += per[m.id]
  }
  return total
}

interface MuscleExercise {
  exerciseId: Id
  /** Serie completate dell'esercizio. */
  sets: number
  /** Serie che contano per il muscolo (serie × % / 100). */
  weighted: number
  maxKg: number
}

/** Esercizi svolti che coinvolgono un muscolo, dal contributo più alto. */
export function muscleExercises(
  sessions: Session[],
  exercises: Pick<Exercise, 'id' | 'muscles'>[],
  muscle: MuscleId,
): MuscleExercise[] {
  const percent = new Map<Id, number>()
  for (const e of exercises) {
    const m = e.muscles.find((x) => x.muscle === muscle)
    if (m && m.percent > 0) percent.set(e.id, m.percent)
  }
  const out = new Map<Id, MuscleExercise>()
  for (const { actual } of doneStrength(sessions)) {
    for (const ex of actual.exercises) {
      const pct = percent.get(ex.exerciseId)
      if (ex.skipped || !pct || ex.sets.length === 0) continue
      const cur = out.get(ex.exerciseId) ?? {
        exerciseId: ex.exerciseId,
        sets: 0,
        weighted: 0,
        maxKg: 0,
      }
      cur.sets += ex.sets.length
      cur.weighted += (ex.sets.length * pct) / 100
      for (const s of ex.sets) cur.maxKg = Math.max(cur.maxKg, s.kg)
      out.set(ex.exerciseId, cur)
    }
  }
  return [...out.values()].sort(
    (a, b) => b.weighted - a.weighted || b.maxKg - a.maxKg,
  )
}

/** Esercizi svolti, dal più frequente (a pari merito il più recente). */
export function performedExercises(sessions: Session[]): Id[] {
  const stats = new Map<Id, { n: number; last: IsoDate }>()
  for (const { date, actual } of doneStrength(sessions)) {
    for (const e of actual.exercises) {
      if (e.skipped || e.sets.length === 0) continue
      const cur = stats.get(e.exerciseId)
      stats.set(e.exerciseId, {
        n: (cur?.n ?? 0) + 1,
        last: cur && cur.last > date ? cur.last : date,
      })
    }
  }
  return [...stats.entries()]
    .sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last))
    .map(([id]) => id)
}
