import type {
  Exercise,
  Id,
  MuscleId,
  Session,
  WorkoutTemplate,
} from '../data/types'

const pad = (n: number) => String(n).padStart(2, '0')

/** 165 → "2:45". */
export function formatMmSs(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

/** "2:45" → 165; `null` se il formato non è mm:ss o il risultato è 0. */
export function parseMmSs(value: string): number | null {
  const m = value.trim().match(/^(\d{1,3}):([0-5]\d)$/)
  if (!m) return null
  const s = Number(m[1]) * 60 + Number(m[2])
  return s > 0 ? s : null
}

export const normalizeName = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

/** Il nome deve essere unico (senza badare a maiuscole), anche tra gli archiviati. */
export function isNameTaken(
  exercises: Exercise[],
  name: string,
  exceptId?: Id,
): boolean {
  const n = normalizeName(name)
  return exercises.some((e) => e.id !== exceptId && normalizeName(e.name) === n)
}

/** Muscoli dal più al meno coinvolto. */
export function sortedMuscles(e: Pick<Exercise, 'muscles'>) {
  return [...e.muscles].sort((a, b) => b.percent - a.percent)
}

export function involvesMuscle(e: Exercise, muscle: MuscleId): boolean {
  return e.muscles.some((m) => m.muscle === muscle)
}

export interface ExerciseUsage {
  templates: number
  sessions: number
}

/** Dove è usato un esercizio: l'eliminazione definitiva è permessa solo a zero. */
export function exerciseUsage(
  id: Id,
  templates: WorkoutTemplate[],
  sessions: Session[],
): ExerciseUsage {
  const planUses = (plan: { discipline: string; exercises?: unknown }) =>
    plan.discipline === 'strength' &&
    (plan.exercises as { exerciseId: Id }[]).some((x) => x.exerciseId === id)
  return {
    templates: templates.filter((t) => planUses(t.plan)).length,
    sessions: sessions.filter(
      (s) =>
        planUses(s.plan) ||
        (s.actual?.discipline === 'strength' &&
          s.actual.exercises.some((x) => x.exerciseId === id)),
    ).length,
  }
}
