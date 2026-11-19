// Eseguito endurance inserito a mano: lettura del modulo, valori calcolati,
// scostamento dal piano e operazioni sulle sedute.
import type {
  BrickActual,
  BrickLegActual,
  EnduranceActual,
  EnduranceDiscipline,
  EnduranceMetrics,
  Id,
  IsoDateTime,
  Session,
} from '../data/types'
import {
  distanceDraft,
  formatClock,
  parseClock,
  parseDistanceM,
  type DistUnit,
} from './enduranceTemplate'

// ---------- modulo ----------

/** I campi digitati di un eseguito (seduta o frazione). */
export interface MetricsDraft {
  time: string
  dist: string
  unit: DistUnit
  avgHr: string
  maxHr: string
  elev: string
}

export type MetricsErrors = Partial<Record<keyof MetricsDraft, true>>

const HR_MIN = 30
const HR_MAX = 250
const ELEV_MAX = 10000

/** Il dislivello si chiede solo per corsa e bici. */
export const hasElevation = (d: EnduranceDiscipline) => d !== 'swim'

const defaultUnit = (d: EnduranceDiscipline): DistUnit =>
  d === 'swim' ? 'm' : 'km'

/** Modulo vuoto o con i dati di un eseguito già salvato. */
export function metricsDraft(
  d: EnduranceDiscipline,
  m?: Partial<EnduranceMetrics>,
): MetricsDraft {
  const dist = m?.distanceM !== undefined ? distanceDraft(m.distanceM) : null
  return {
    time: m?.durationS ? formatClock(m.durationS) : '',
    dist: dist?.text ?? '',
    unit: dist?.unit ?? defaultUnit(d),
    avgHr: m?.avgHr !== undefined ? String(m.avgHr) : '',
    maxHr: m?.maxHr !== undefined ? String(m.maxHr) : '',
    elev: m?.elevationGainM !== undefined ? String(m.elevationGainM) : '',
  }
}

/** Intero in [min, max], `null` se vuoto, `undefined` se non valido. */
function intIn(
  raw: string,
  min: number,
  max: number,
): number | null | undefined {
  const v = raw.trim()
  if (!v) return null
  if (!/^\d+$/.test(v)) return undefined
  const n = Number(v)
  return n >= min && n <= max ? n : undefined
}

/**
 * Legge il modulo: tempo obbligatorio (m:ss o h:mm:ss), il resto facoltativo.
 * FC intere 30–250 con la massima non sotto la media; dislivello 0–10000 m.
 */
export function parseMetrics(
  d: EnduranceDiscipline,
  f: MetricsDraft,
): { metrics: EnduranceMetrics | null; errors: MetricsErrors } {
  const errors: MetricsErrors = {}
  const durationS = parseClock(f.time)
  if (durationS === null) errors.time = true
  const distanceM = f.dist.trim() ? parseDistanceM(f.dist, f.unit) : null
  if (f.dist.trim() && distanceM === null) errors.dist = true
  const avgHr = intIn(f.avgHr, HR_MIN, HR_MAX)
  if (avgHr === undefined) errors.avgHr = true
  const maxHr = intIn(f.maxHr, HR_MIN, HR_MAX)
  if (maxHr === undefined) errors.maxHr = true
  if (avgHr && maxHr && maxHr < avgHr) errors.maxHr = true
  const elev = hasElevation(d) ? intIn(f.elev, 0, ELEV_MAX) : null
  if (elev === undefined) errors.elev = true
  if (Object.keys(errors).length > 0 || durationS === null) {
    return { metrics: null, errors }
  }
  return {
    metrics: {
      durationS,
      ...(distanceM !== null && { distanceM }),
      ...(avgHr && { avgHr }),
      ...(maxHr && { maxHr }),
      ...(elev !== null && elev !== undefined && { elevationGainM: elev }),
    },
    errors,
  }
}

// ---------- valori calcolati ----------

/**
 * Passo o velocità medi, nella stessa unità dell'intensità dei piani:
 * corsa s/km, nuoto s/100 m, bici km/h. `null` senza distanza.
 */
export function averageIntensity(
  d: EnduranceDiscipline,
  m: Pick<EnduranceMetrics, 'distanceM' | 'durationS'>,
): number | null {
  if (!m.distanceM || !m.durationS) return null
  if (d === 'bike') {
    return Math.round((m.distanceM / 1000 / (m.durationS / 3600)) * 10) / 10
  }
  const per = d === 'run' ? 1000 : 100
  return Math.round(m.durationS / (m.distanceM / per))
}

/** Scostamento in % dall'atteso (+5 = 5 % in più); `null` se manca un dato. */
export function deviationPct(
  actual: number | null | undefined,
  planned: number | null | undefined,
): number | null {
  if (!actual || !planned) return null
  return Math.round(((actual - planned) / planned) * 100)
}

interface BrickActualTotals {
  durationS: number
  transitionsS: number
  /** Distanza per sport (solo dove inserita). */
  distanceBySport: Partial<Record<EnduranceDiscipline, number>>
}

/** Totali di un brick eseguito: frazioni + transizioni. */
export function brickActualTotals(a: BrickActual): BrickActualTotals {
  let durationS = 0
  let transitionsS = 0
  const distanceBySport: Partial<Record<EnduranceDiscipline, number>> = {}
  a.legs.forEach((l, i) => {
    durationS += l.durationS
    if (i > 0 && l.transitionBeforeS) transitionsS += l.transitionBeforeS
    if (l.distanceM) {
      distanceBySport[l.discipline] =
        (distanceBySport[l.discipline] ?? 0) + l.distanceM
    }
  })
  return { durationS: durationS + transitionsS, transitionsS, distanceBySport }
}

/** Secondi eseguiti per sport: ogni frazione con la transizione che la precede. */
export function brickActualSecondsBySport(
  a: BrickActual,
): Partial<Record<EnduranceDiscipline, number>> {
  const out: Partial<Record<EnduranceDiscipline, number>> = {}
  a.legs.forEach((l, i) => {
    const s = l.durationS + (i > 0 ? (l.transitionBeforeS ?? 0) : 0)
    out[l.discipline] = (out[l.discipline] ?? 0) + s
  })
  return out
}

// ---------- costruzione ----------

const extras = (rpe: number | null, notes: string) => {
  const n = notes.trim()
  return { ...(rpe !== null && { rpe }), ...(n && { notes: n }) }
}

export function enduranceActual(
  d: EnduranceDiscipline,
  metrics: EnduranceMetrics,
  rpe: number | null,
  notes: string,
): EnduranceActual {
  return {
    discipline: d,
    source: 'manual',
    ...metrics,
    ...extras(rpe, notes),
    laps: [],
  }
}

export function brickActual(
  legs: BrickLegActual[],
  rpe: number | null,
  notes: string,
): BrickActual {
  return {
    discipline: 'brick',
    source: 'manual',
    legs: legs.map((l, i) => {
      if (i > 0 || l.transitionBeforeS === undefined) return l
      const { transitionBeforeS: _t, ...rest } = l
      void _t
      return rest
    }),
    ...extras(rpe, notes),
  }
}

// ---------- sedute ----------

/** Salva l'eseguito: la seduta diventa completata. */
export function setSessionActual(
  sessions: Session[],
  id: Id,
  actual: EnduranceActual | BrickActual,
  now: IsoDateTime,
): Session[] {
  return sessions.map((s) => {
    if (s.id !== id) return s
    if (s.discipline === 'brick' && actual.discipline === 'brick')
      return { ...s, status: 'done', actual, updatedAt: now }
    if (
      s.discipline !== 'brick' &&
      s.discipline !== 'strength' &&
      actual.discipline === s.discipline
    )
      return { ...s, status: 'done', actual, updatedAt: now }
    return s
  })
}

/** Elimina l'eseguito: la seduta torna programmata. */
export function clearSessionActual(
  sessions: Session[],
  id: Id,
  now: IsoDateTime,
): Session[] {
  return sessions.map((s) => {
    if (s.id !== id || s.discipline === 'strength' || !s.actual) return s
    const { actual: _a, ...rest } = s
    void _a
    return { ...rest, status: 'planned', updatedAt: now } as Session
  })
}
