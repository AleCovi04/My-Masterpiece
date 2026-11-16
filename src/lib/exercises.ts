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

/** Muscoli principali: quelli con la % più alta (a pari merito, tutti). */
export function primaryMuscles(e: Pick<Exercise, 'muscles'>): MuscleId[] {
  const max = Math.max(0, ...e.muscles.map((m) => m.percent))
  return e.muscles.filter((m) => m.percent === max).map((m) => m.muscle)
}

export interface MuscleMatch {
  exercise: Exercise
  /** Somma delle % dei soli muscoli scelti. */
  sum: number
}

export interface MuscleSections {
  primary: MuscleMatch[]
  secondary: MuscleMatch[]
}

/**
 * Filtro per muscoli: solo esercizi che li coinvolgono tutti (a qualsiasi %).
 * Principale = almeno un muscolo scelto è principale; ogni sezione per somma
 * delle % decrescente, a parità per nome.
 */
export function filterByMuscles(
  exercises: Exercise[],
  selected: MuscleId[],
  locale: string,
): MuscleSections {
  const primary: MuscleMatch[] = []
  const secondary: MuscleMatch[] = []
  for (const exercise of exercises) {
    if (!selected.every((id) => involvesMuscle(exercise, id))) continue
    const sum = exercise.muscles
      .filter((m) => selected.includes(m.muscle))
      .reduce((acc, m) => acc + m.percent, 0)
    const main = primaryMuscles(exercise)
    ;(selected.some((id) => main.includes(id)) ? primary : secondary).push({
      exercise,
      sum,
    })
  }
  const byRank = (a: MuscleMatch, b: MuscleMatch) =>
    b.sum - a.sum || a.exercise.name.localeCompare(b.exercise.name, locale)
  return { primary: primary.sort(byRank), secondary: secondary.sort(byRank) }
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
  return {
    templates: templates.filter(
      (t) =>
        t.discipline === 'strength' &&
        t.entries.some((x) => x.exerciseId === id),
    ).length,
    sessions: sessions.filter(
      (s) =>
        s.discipline === 'strength' &&
        (s.plan.entries.some((x) => x.exerciseId === id) ||
          !!s.actual?.exercises.some((x) => x.exerciseId === id)),
    ).length,
  }
}
