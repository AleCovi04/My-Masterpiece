// Carico di allenamento: sRPE (minuti × RPE) e curve Forma/Fatica.
import type { IsoDate, Session, Sport } from '../data/types'
import { addDays, parseIsoDate, toIsoDate } from './dates'
import { brickActualSecondsBySport } from './enduranceActual'
import { actualSeconds, DISCIPLINES } from './weekStats'

/** RPE usato quando la seduta svolta non ne ha uno. */
export const DEFAULT_RPE = 5
/** Giorni delle medie: Forma (lungo periodo) e Fatica (breve periodo). */
export const FITNESS_DAYS = 42
export const FATIGUE_DAYS = 7

export type SportLoad = Record<Sport, number>

const emptyLoad = (): SportLoad =>
  Object.fromEntries(DISCIPLINES.map((d) => [d, 0])) as SportLoad

/** RPE della seduta svolta, se indicato. */
export function sessionRpe(s: Session): number | undefined {
  return s.status === 'done' ? s.actual?.rpe : undefined
}

/**
 * Carico sRPE per sport di una seduta svolta: minuti eseguiti × RPE (5 se
 * manca). Il brick si divide tra gli sport delle frazioni in base al tempo.
 */
export function sessionLoad(s: Session): Partial<SportLoad> {
  if (s.status !== 'done' || !s.actual) return {}
  const rpe = s.actual.rpe ?? DEFAULT_RPE
  if (s.discipline === 'brick' && s.actual.discipline === 'brick') {
    const out: Partial<SportLoad> = {}
    for (const [d, sec] of Object.entries(
      brickActualSecondsBySport(s.actual),
    )) {
      out[d as Sport] = (sec / 60) * rpe
    }
    return out
  }
  if (s.discipline === 'brick') return {}
  return { [s.discipline]: (actualSeconds(s) / 60) * rpe }
}

export function loadBySport(sessions: Session[]): SportLoad {
  const out = emptyLoad()
  for (const s of sessions) {
    for (const [d, v] of Object.entries(sessionLoad(s))) out[d as Sport] += v
  }
  return out
}

export const totalLoad = (l: SportLoad): number =>
  DISCIPLINES.reduce((a, d) => a + l[d], 0)

/** Sedute svolte senza RPE (contate con il valore predefinito). */
export const withoutRpe = (sessions: Session[]): number =>
  sessions.filter((s) => s.status === 'done' && s.actual && !s.actual.rpe)
    .length

export interface FitnessPoint {
  date: IsoDate
  /** Media esponenziale a 42 giorni del carico giornaliero. */
  fitness: number
  /** Media esponenziale a 7 giorni. */
  fatigue: number
}

/**
 * Forma e Fatica giorno per giorno tra `start` ed `end` (inclusi). Le medie
 * partono dalla prima seduta svolta, così all'inizio del periodo tengono
 * conto di tutto lo storico.
 */
export function fitnessFatigue(
  sessions: Session[],
  start: IsoDate,
  end: IsoDate,
): FitnessPoint[] {
  const daily = new Map<IsoDate, number>()
  let first: IsoDate | null = null
  for (const s of sessions) {
    const l = totalLoad({ ...emptyLoad(), ...sessionLoad(s) })
    if (l <= 0) continue
    daily.set(s.date, (daily.get(s.date) ?? 0) + l)
    if (!first || s.date < first) first = s.date
  }
  const from = first && first < start ? first : start
  const out: FitnessPoint[] = []
  let fitness = 0
  let fatigue = 0
  for (let d = parseIsoDate(from); toIsoDate(d) <= end; d = addDays(d, 1)) {
    const date = toIsoDate(d)
    const l = daily.get(date) ?? 0
    fitness += (l - fitness) / FITNESS_DAYS
    fatigue += (l - fatigue) / FATIGUE_DAYS
    if (date >= start) out.push({ date, fitness, fatigue })
  }
  return out
}
