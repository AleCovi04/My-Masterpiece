// Record e progressione di un esercizio di forza. Funzioni pure.
//
// Metriche, per seduta e su tutto lo storico:
// - peso massimo: kg più alti in una serie, a qualsiasi numero di ripetizioni;
// - record a N ripetizioni (N = 1, 4, 6, 8, 10, 12): kg più alti in una serie
//   con almeno N ripetizioni (36 × 5 conta anche per N = 4); N = 1 coincide
//   con il peso massimo;
// - volume massimo in una serie: max(kg × reps);
// - volume della seduta: Σ kg × reps dell'esercizio in quell'allenamento.
// Un record è un valore che supera (strettamente) il migliore precedente: la
// prima volta che si fa una metrica non c'è niente da battere, quindi non è
// un record.
import type { ActualSet, Id, IsoDate, Session } from '../data/types'

export const REP_TARGETS = [1, 4, 6, 8, 10, 12] as const
export type RepTarget = (typeof REP_TARGETS)[number]

export type RepMetric = `r${RepTarget}`
export type RecordMetric = 'maxKg' | RepMetric | 'setVolume' | 'sessionVolume'

export const repMetric = (n: RepTarget): RepMetric => `r${n}`

/** Tutte le metriche, nell'ordine della tabella. */
export const RECORD_METRICS: RecordMetric[] = [
  'maxKg',
  ...REP_TARGETS.map(repMetric),
  'setVolume',
  'sessionVolume',
]

/** Metriche segnalate come nuovi record (N = 1 è già il peso massimo). */
export const HIT_METRICS: RecordMetric[] = RECORD_METRICS.filter(
  (m) => m !== 'r1',
)

type SetLike = Pick<ActualSet, 'kg' | 'reps'>

/** Una serie che dà il valore di una metrica (assente per il volume della seduta). */
export interface SetRef {
  kg: number
  reps: number
}

/** Valori di un esercizio in una seduta. */
export interface SessionStats {
  /** Valore di ogni metrica; `null` = nessuna serie che conta (es. nessuna con ≥ 10 reps). */
  values: Record<RecordMetric, number | null>
  /** Serie da cui viene il valore (non per il volume della seduta). */
  sets: Partial<Record<RecordMetric, SetRef>>
  /** Serie completate. */
  count: number
}

const emptyValues = (): Record<RecordMetric, number | null> =>
  Object.fromEntries(RECORD_METRICS.map((m) => [m, null])) as Record<
    RecordMetric,
    number | null
  >

/** Valori delle metriche per le serie di una seduta (a pari valore conta la prima serie). */
export function sessionStats(sets: SetLike[]): SessionStats {
  const values = emptyValues()
  const refs: Partial<Record<RecordMetric, SetRef>> = {}
  const better = (m: RecordMetric, v: number, s: SetLike) => {
    const cur = values[m]
    if (cur === null || v > cur) {
      values[m] = v
      refs[m] = { kg: s.kg, reps: s.reps }
    }
  }
  let volume = 0
  for (const s of sets) {
    if (s.reps <= 0) continue
    better('maxKg', s.kg, s)
    for (const n of REP_TARGETS) if (s.reps >= n) better(repMetric(n), s.kg, s)
    better('setVolume', s.kg * s.reps, s)
    volume += s.kg * s.reps
  }
  if (sets.some((s) => s.reps > 0)) values.sessionVolume = volume
  return { values, sets: refs, count: sets.length }
}

/** Un nuovo record: il valore di adesso e il migliore di prima. */
export interface RecordHit {
  metric: RecordMetric
  value: number
  previous: number
  /** Serie del record (non per il volume della seduta). */
  set?: SetRef
}

/** Metriche in cui `cur` supera il migliore precedente (`best`); senza un precedente nessun record. */
export function recordHits(
  best: Record<RecordMetric, number | null>,
  cur: SessionStats,
  metrics: RecordMetric[] = HIT_METRICS,
): RecordHit[] {
  const out: RecordHit[] = []
  for (const m of metrics) {
    const prev = best[m]
    const value = cur.values[m]
    if (prev === null || value === null || value <= prev + 1e-9) continue
    out.push({
      metric: m,
      value,
      previous: prev,
      ...(cur.sets[m] && { set: cur.sets[m] }),
    })
  }
  return out
}

/** Migliori valori dopo aver aggiunto una seduta. */
function mergeBest(
  best: Record<RecordMetric, number | null>,
  cur: SessionStats,
): Record<RecordMetric, number | null> {
  const next = { ...best }
  for (const m of RECORD_METRICS) {
    const v = cur.values[m]
    if (v !== null && (next[m] === null || v > (next[m] as number))) next[m] = v
  }
  return next
}

/** Una seduta svolta in cui l'esercizio è stato eseguito. */
export interface ExerciseSession {
  sessionId: Id
  date: IsoDate
  stats: SessionStats
  /** Metriche in cui la seduta ha battuto tutto lo storico precedente. */
  records: RecordMetric[]
}

/**
 * Storico di un esercizio, una voce per seduta svolta (in ordine di data e di
 * posizione nel giorno), con i nuovi record di ogni seduta rispetto a tutte
 * quelle precedenti. Esercizi saltati e sedute senza serie esclusi.
 */
export function exerciseHistory(
  sessions: Session[],
  exerciseId: Id,
): ExerciseSession[] {
  const done = sessions
    .flatMap((s) =>
      s.status === 'done' && s.discipline === 'strength' && s.actual
        ? [{ s, actual: s.actual }]
        : [],
    )
    .sort((a, b) => a.s.date.localeCompare(b.s.date) || a.s.order - b.s.order)
  const out: ExerciseSession[] = []
  let best = emptyValues()
  for (const { s, actual } of done) {
    const sets = actual.exercises
      .filter((e) => e.exerciseId === exerciseId && !e.skipped)
      .flatMap((e) => e.sets)
    if (sets.length === 0) continue
    const stats = sessionStats(sets)
    out.push({
      sessionId: s.id,
      date: s.date,
      stats,
      records: recordHits(best, stats, RECORD_METRICS).map((h) => h.metric),
    })
    best = mergeBest(best, stats)
  }
  return out
}

/** Migliori valori di tutto lo storico (per confrontare una seduta nuova). */
export function bestValues(
  history: ExerciseSession[],
): Record<RecordMetric, number | null> {
  return history.reduce((b, h) => mergeBest(b, h.stats), emptyValues())
}

/** Un record dello storico, con la data in cui è stato fatto. */
export interface DatedRecord {
  value: number
  date: IsoDate
  set?: SetRef
}

/** Record di un esercizio su tutto lo storico (la prima volta che è stato raggiunto). */
export function exerciseRecords(
  history: ExerciseSession[],
): Partial<Record<RecordMetric, DatedRecord>> {
  const out: Partial<Record<RecordMetric, DatedRecord>> = {}
  for (const h of history) {
    for (const m of RECORD_METRICS) {
      const v = h.stats.values[m]
      const cur = out[m]
      if (v === null || (cur && v <= cur.value)) continue
      out[m] = {
        value: v,
        date: h.date,
        ...(h.stats.sets[m] && { set: h.stats.sets[m] }),
      }
    }
  }
  return out
}

/** Record di ogni esercizio di una seduta nuova rispetto allo storico (riepilogo di fine allenamento). */
export function newRecords(
  history: Session[],
  current: { exerciseId: Id; sets: SetLike[] }[],
): { exerciseId: Id; hits: RecordHit[] }[] {
  const byExercise = new Map<Id, SetLike[]>()
  for (const c of current) {
    byExercise.set(c.exerciseId, [
      ...(byExercise.get(c.exerciseId) ?? []),
      ...c.sets,
    ])
  }
  const out: { exerciseId: Id; hits: RecordHit[] }[] = []
  for (const [exerciseId, sets] of byExercise) {
    if (sets.length === 0) continue
    const best = bestValues(exerciseHistory(history, exerciseId))
    const hits = recordHits(best, sessionStats(sets))
    if (hits.length > 0) out.push({ exerciseId, hits })
  }
  return out
}
