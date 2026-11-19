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
type RepTarget = (typeof REP_TARGETS)[number]

export type RepMetric = `r${RepTarget}`
export type RecordMetric = 'maxKg' | RepMetric | 'setVolume' | 'sessionVolume'

export const repMetric = (n: RepTarget): RepMetric => `r${n}`

/** Tutte le metriche, nell'ordine della tabella. */
const RECORD_METRICS: RecordMetric[] = [
  'maxKg',
  ...REP_TARGETS.map(repMetric),
  'setVolume',
  'sessionVolume',
]

/** Metriche segnalate come nuovi record (N = 1 è già il peso massimo). */
const HIT_METRICS: RecordMetric[] = RECORD_METRICS.filter((m) => m !== 'r1')

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
  /** Posizione della seduta nel giorno. */
  order: number
  stats: SessionStats
  /** Metriche in cui la seduta ha battuto tutto lo storico precedente. */
  records: RecordMetric[]
}

/**
 * Storico di ogni esercizio in una sola passata: una voce per seduta svolta
 * (in ordine di data e di posizione nel giorno), con i nuovi record di ogni
 * seduta rispetto a tutte quelle precedenti. Esercizi saltati e sedute senza
 * serie esclusi.
 */
export function allHistories(sessions: Session[]): Map<Id, ExerciseSession[]> {
  const done = sessions
    .flatMap((s) =>
      s.status === 'done' && s.discipline === 'strength' && s.actual
        ? [{ s, actual: s.actual }]
        : [],
    )
    .sort((a, b) => a.s.date.localeCompare(b.s.date) || a.s.order - b.s.order)
  const out = new Map<Id, ExerciseSession[]>()
  const best = new Map<Id, Record<RecordMetric, number | null>>()
  for (const { s, actual } of done) {
    const byExercise = new Map<Id, SetLike[]>()
    for (const e of actual.exercises) {
      if (e.skipped || e.sets.length === 0) continue
      byExercise.set(e.exerciseId, [
        ...(byExercise.get(e.exerciseId) ?? []),
        ...e.sets,
      ])
    }
    for (const [id, sets] of byExercise) {
      const stats = sessionStats(sets)
      const prev = best.get(id) ?? emptyValues()
      const list = out.get(id) ?? []
      list.push({
        sessionId: s.id,
        date: s.date,
        order: s.order,
        stats,
        records: recordHits(prev, stats, RECORD_METRICS).map((h) => h.metric),
      })
      out.set(id, list)
      best.set(id, mergeBest(prev, stats))
    }
  }
  return out
}

/** Storico di un esercizio (vedi `allHistories`). */
export function exerciseHistory(
  sessions: Session[],
  exerciseId: Id,
): ExerciseSession[] {
  return allHistories(sessions).get(exerciseId) ?? []
}

/** Riepilogo di un esercizio per la lista dell'Analisi. */
export interface ExerciseSummary {
  /** Peso massimo di sempre. */
  maxKg: number | null
  /** Volume massimo in una serie di sempre. */
  setVolume: number | null
  /** Ultima seduta in cui è stato fatto. */
  lastDate: IsoDate
  /** Ultima seduta con un nuovo record (`null` = nessuno). */
  lastRecordDate: IsoDate | null
}

export function exerciseSummary(
  history: ExerciseSession[],
): ExerciseSummary | null {
  if (history.length === 0) return null
  const best = bestValues(history)
  const withRecord = history.filter((h) => h.records.length > 0)
  return {
    maxKg: best.maxKg,
    setVolume: best.setVolume,
    lastDate: history[history.length - 1].date,
    lastRecordDate: withRecord.at(-1)?.date ?? null,
  }
}

/** Un record recente: il primo battuto in quella seduta (ordine della tabella) e quanti altri. */
interface LatestRecord {
  exerciseId: Id
  sessionId: Id
  date: IsoDate
  /** Posizione della seduta nel giorno. */
  order: number
  metric: RecordMetric
  value: number
  set?: SetRef
  /** Altri record battuti nella stessa seduta sullo stesso esercizio. */
  others: number
}

/**
 * Gli ultimi `limit` record, dal più recente: uno per esercizio e seduta, il
 * primo nell'ordine della tabella (N = 1 coincide con il peso massimo e non
 * si conta due volte).
 */
export function latestRecords(
  histories: Map<Id, ExerciseSession[]>,
  limit = 5,
): LatestRecord[] {
  const all: LatestRecord[] = []
  for (const [exerciseId, history] of histories) {
    for (const h of history) {
      const hits = HIT_METRICS.filter((m) => h.records.includes(m))
      if (hits.length === 0) continue
      const metric = hits[0]
      all.push({
        exerciseId,
        sessionId: h.sessionId,
        date: h.date,
        order: h.order,
        metric,
        value: h.stats.values[metric] as number,
        ...(h.stats.sets[metric] && { set: h.stats.sets[metric] }),
        others: hits.length - 1,
      })
    }
  }
  return all
    .sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order)
    .slice(0, limit)
}

/** Migliori valori di tutto lo storico (per confrontare una seduta nuova). */
export function bestValues(
  history: ExerciseSession[],
): Record<RecordMetric, number | null> {
  return history.reduce((b, h) => mergeBest(b, h.stats), emptyValues())
}

/** Un record dello storico, con la data in cui è stato fatto. */
interface DatedRecord {
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
