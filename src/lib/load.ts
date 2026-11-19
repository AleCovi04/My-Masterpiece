// Carico di allenamento: sRPE (minuti × RPE), Forma/Fatica, ACWR e Freschezza.
import type { Id, IsoDate, IsoDateTime, Session, Sport } from '../data/types'
import { addDays, daysBetween, parseIsoDate, toIsoDate } from './dates'
import { brickActualSecondsBySport } from './enduranceActual'
import { actualSeconds, DISCIPLINES } from './weekStats'

/** Scala dell'RPE. */
const RPE_MIN = 1
const RPE_MAX = 10
export const RPE_VALUES = Array.from(
  { length: RPE_MAX - RPE_MIN + 1 },
  (_, i) => RPE_MIN + i,
)

/** Giorni delle medie: Forma (lungo periodo) e Fatica (breve periodo). */
const FITNESS_DAYS = 42
const FATIGUE_DAYS = 7
/** Finestre del rapporto acuto/cronico. */
const ACUTE_DAYS = 7
const CHRONIC_DAYS = 28
/** Storico minimo (dalla prima seduta con RPE) per mostrare gli indicatori. */
const MIN_HISTORY_DAYS = 28

/** Zone del rapporto acuto/cronico, in ordine: vale la prima con `v < max`. */
export const ACWR_ZONES = [
  { key: 'low', max: 0.8 },
  { key: 'safe', max: 1.3 },
  { key: 'caution', max: 1.5 },
  { key: 'high', max: Infinity },
] as const
export type AcwrZone = (typeof ACWR_ZONES)[number]['key']
/** Fondo scala dell'indicatore ACWR. */
export const ACWR_SCALE_MAX = 2

/** Zone della Freschezza %, in ordine: vale la prima con `pct > min`. */
export const FRESHNESS_ZONES = [
  { key: 'fresh', min: 5 },
  { key: 'neutral', min: -10 },
  { key: 'productive', min: -30 },
  { key: 'overload', min: -Infinity },
] as const
export type FreshnessZone = (typeof FRESHNESS_ZONES)[number]['key']

/** Tendenza della Forma: confronto con N giorni prima, soglia in %. */
const TREND_DAYS = 14
const TREND_THRESHOLD_PCT = 5
type Trend = 'up' | 'flat' | 'down'

type SportLoad = Record<Sport, number>

const emptyLoad = (): SportLoad =>
  Object.fromEntries(DISCIPLINES.map((d) => [d, 0])) as SportLoad

const validRpe = (v: unknown): v is number =>
  typeof v === 'number' && v >= RPE_MIN && v <= RPE_MAX

/** RPE della seduta svolta, se indicato. */
export function sessionRpe(s: Session): number | undefined {
  const v = s.status === 'done' ? s.actual?.rpe : undefined
  return validRpe(v) ? v : undefined
}

/** Sedute svolte senza RPE: escluse dal carico, da segnalare. */
export const missingRpe = (sessions: Session[]): Session[] =>
  sessions.filter(
    (s) => s.status === 'done' && !!s.actual && sessionRpe(s) === undefined,
  )

/**
 * Carico sRPE per sport di una seduta svolta: minuti eseguiti × RPE. Senza RPE
 * la seduta non conta. Il brick si divide tra gli sport delle frazioni in base al tempo.
 */
export function sessionLoad(s: Session): Partial<SportLoad> {
  const rpe = sessionRpe(s)
  if (rpe === undefined || !s.actual) return {}
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

/** Carico totale per giorno e primo giorno con carico. */
function dailyLoad(sessions: Session[]) {
  const daily = new Map<IsoDate, number>()
  let first: IsoDate | null = null
  for (const s of sessions) {
    const l = totalLoad({ ...emptyLoad(), ...sessionLoad(s) })
    if (l <= 0) continue
    daily.set(s.date, (daily.get(s.date) ?? 0) + l)
    if (!first || s.date < first) first = s.date
  }
  return { daily, first }
}

interface FitnessPoint {
  date: IsoDate
  /** Media esponenziale a 42 giorni del carico giornaliero. */
  fitness: number
  /** Media esponenziale a 7 giorni. */
  fatigue: number
}

/**
 * Forma e Fatica giorno per giorno tra `start` ed `end` (inclusi):
 * CTL_t = CTL_{t-1} + (L_t − CTL_{t-1}) / 42, idem a 7 giorni; i giorni senza
 * sedute hanno L = 0. Le medie partono dalla prima seduta con carico.
 */
export function fitnessFatigue(
  sessions: Session[],
  start: IsoDate,
  end: IsoDate,
): FitnessPoint[] {
  const { daily, first } = dailyLoad(sessions)
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

export function acwrZone(v: number): AcwrZone {
  return ACWR_ZONES.find((z) => v < z.max)!.key
}

export function freshnessZone(pct: number): FreshnessZone {
  return FRESHNESS_ZONES.find((z) => pct > z.min)!.key
}

/** Tendenza tra due valori della Forma. */
export function trendOf(now: number, before: number): Trend {
  if (before <= 0) return now > 0 ? 'up' : 'flat'
  const pct = ((now - before) / before) * 100
  if (pct > TREND_THRESHOLD_PCT) return 'up'
  if (pct < -TREND_THRESHOLD_PCT) return 'down'
  return 'flat'
}

type LoadStatus =
  | { enough: false; historyDays: number }
  | {
      enough: true
      /** Carico degli ultimi 7 giorni. */
      acute: number
      /** Media settimanale degli ultimi 28 giorni. */
      chronicWeekly: number
      /** Rapporto acuto/cronico (null se il cronico è zero). */
      acwr: number | null
      fitness: number
      fatigue: number
      /** (Forma − Fatica) / Forma × 100 (null se la Forma è zero). */
      freshnessPct: number | null
      trend: Trend
    }

/** Indicatori del carico al giorno `ref` (incluso). */
export function loadStatus(sessions: Session[], ref: IsoDate): LoadStatus {
  const { daily, first } = dailyLoad(sessions.filter((s) => s.date <= ref))
  const historyDays = first ? daysBetween(first, ref) + 1 : 0
  if (historyDays < MIN_HISTORY_DAYS) return { enough: false, historyDays }
  const sumLast = (n: number) => {
    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += daily.get(toIsoDate(addDays(parseIsoDate(ref), -i))) ?? 0
    }
    return sum
  }
  const acute = sumLast(ACUTE_DAYS)
  const chronicWeekly = sumLast(CHRONIC_DAYS) / (CHRONIC_DAYS / 7)
  const before = toIsoDate(addDays(parseIsoDate(ref), -TREND_DAYS))
  const pts = fitnessFatigue(sessions, before, ref)
  const now = pts[pts.length - 1]
  const { fitness, fatigue } = now
  return {
    enough: true,
    acute,
    chronicWeekly,
    acwr: chronicWeekly > 0 ? acute / chronicWeekly : null,
    fitness,
    fatigue,
    freshnessPct: fitness > 0 ? ((fitness - fatigue) / fitness) * 100 : null,
    trend: trendOf(fitness, pts[0].fitness),
  }
}

/** Aggiunge o cambia l'RPE di una seduta svolta. */
export function setSessionRpe(
  sessions: Session[],
  id: Id,
  rpe: number,
  now: IsoDateTime,
): Session[] {
  if (!validRpe(rpe)) return sessions
  return sessions.map((s) =>
    s.id === id && s.status === 'done' && s.actual
      ? ({
          ...s,
          actual: { ...s.actual, rpe: Math.round(rpe) },
          updatedAt: now,
        } as Session)
      : s,
  )
}
