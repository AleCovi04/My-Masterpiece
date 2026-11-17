// Recupero muscolare stimato (mappa "Recupero" dell'Analisi). Funzioni pure.
//
// Fatica di un muscolo all'istante t:
//   F_m(t) = Σ_i serie_i · %_i / 100 · e^(−(t − t_i) / τ)
// sommando ogni esercizio i svolto prima di t (serie completate, coinvolgimento
// del muscolo in %), con τ = RECOVERY_TAU_H ore. Non dipende dal periodo scelto.
import type {
  Exercise,
  Id,
  IsoDate,
  MuscleId,
  Session,
  StrengthActual,
} from '../data/types'
import { MUSCLES } from '../data/types'
import { parseIsoDate } from './dates'

/** Costante di tempo del recupero, in ore. */
export const RECOVERY_TAU_H = 48

/** Fatica (serie pesate) che corrisponde al colore pieno "affaticato". */
export const FATIGUE_FULL = 8

/** Sotto questa fatica il muscolo si considera recuperato (colore neutro). */
export const FATIGUE_MIN = 0.25

const HOUR_MS = 3_600_000

type ExerciseMuscles = Pick<Exercise, 'id' | 'muscles'>

interface DoneStrength {
  session: Session
  actual: StrengthActual
  /** Istante della seduta (ms). */
  at: number
}

/**
 * Istante di una seduta svolta: la fine registrata dal vivo (`endedAt`), se
 * manca l'ultima serie completata, altrimenti mezzogiorno di quel giorno.
 */
export function sessionInstant(date: IsoDate, actual: StrengthActual): number {
  const ended = actual.endedAt ? Date.parse(actual.endedAt) : NaN
  if (Number.isFinite(ended)) return ended
  const last = Math.max(
    -Infinity,
    ...actual.exercises.flatMap((e) =>
      e.sets.map((s) => Date.parse(s.completedAt)).filter(Number.isFinite),
    ),
  )
  if (Number.isFinite(last)) return last
  return parseIsoDate(date).getTime() + 12 * HOUR_MS
}

function doneStrength(sessions: Session[], nowMs: number): DoneStrength[] {
  return sessions.flatMap((s) => {
    if (s.status !== 'done' || s.discipline !== 'strength' || !s.actual) {
      return []
    }
    const at = sessionInstant(s.date, s.actual)
    return at <= nowMs ? [{ session: s, actual: s.actual, at }] : []
  })
}

const zero = () =>
  Object.fromEntries(MUSCLES.map((m) => [m.id, 0])) as Record<MuscleId, number>

/** Fatica di ogni muscolo adesso (`nowMs`); le sedute dopo `nowMs` non contano. */
export function muscleFatigue(
  sessions: Session[],
  exercises: ExerciseMuscles[],
  nowMs: number,
  tauH = RECOVERY_TAU_H,
): Record<MuscleId, number> {
  const out = zero()
  const byId = new Map(exercises.map((e) => [e.id, e]))
  for (const { actual, at } of doneStrength(sessions, nowMs)) {
    const decay = Math.exp(-(nowMs - at) / (tauH * HOUR_MS))
    for (const pe of actual.exercises) {
      const ex = byId.get(pe.exerciseId)
      if (pe.skipped || !ex || pe.sets.length === 0) continue
      for (const m of ex.muscles) {
        out[m.muscle] += ((pe.sets.length * m.percent) / 100) * decay
      }
    }
  }
  return out
}

/** Quanto è affaticato, da 0 (recuperato) a 1 (colore pieno). */
export const fatigueLevel = (f: number): number =>
  f < FATIGUE_MIN ? 0 : Math.min(1, f / FATIGUE_FULL)

export interface LastTrained {
  date: IsoDate
  /** Istante della seduta (ms). */
  at: number
  exercises: { exerciseId: Id; sets: number; weighted: number }[]
}

/** Ultima seduta svolta (fino a `nowMs`) in cui il muscolo ha lavorato, con gli esercizi. */
export function lastTrained(
  sessions: Session[],
  exercises: ExerciseMuscles[],
  muscle: MuscleId,
  nowMs: number,
): LastTrained | null {
  const percent = new Map<Id, number>()
  for (const e of exercises) {
    const m = e.muscles.find((x) => x.muscle === muscle)
    if (m && m.percent > 0) percent.set(e.id, m.percent)
  }
  let best: LastTrained | null = null
  for (const { session, actual, at } of doneStrength(sessions, nowMs)) {
    if (best && at <= best.at) continue
    const list = new Map<
      Id,
      { exerciseId: Id; sets: number; weighted: number }
    >()
    for (const pe of actual.exercises) {
      const pct = percent.get(pe.exerciseId)
      if (pe.skipped || !pct || pe.sets.length === 0) continue
      const cur = list.get(pe.exerciseId) ?? {
        exerciseId: pe.exerciseId,
        sets: 0,
        weighted: 0,
      }
      cur.sets += pe.sets.length
      cur.weighted += (pe.sets.length * pct) / 100
      list.set(pe.exerciseId, cur)
    }
    if (list.size === 0) continue
    best = {
      date: session.date,
      at,
      exercises: [...list.values()].sort((a, b) => b.weighted - a.weighted),
    }
  }
  return best
}
