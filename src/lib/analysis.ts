// Analisi: periodi, intervalli dell'asse e volumi per disciplina.
import type {
  EnduranceDiscipline,
  IsoDate,
  Session,
  Sport,
} from '../data/types'
import { legTotals } from './brick'
import {
  addDays,
  daysBetween,
  mondayOf,
  parseIsoDate,
  toIsoDate,
} from './dates'
import { brickActualTotals } from './enduranceActual'
import { templateTotals } from './enduranceTemplate'
import type { PlanItem, Timing } from './plan'
import { DISCIPLINES, loadByDiscipline } from './weekStats'

export const ENDURANCE: EnduranceDiscipline[] = ['swim', 'bike', 'run']

/** Periodo scelto nel filtro dell'Analisi. */
export type Period =
  | { kind: 'weeks'; weeks: number }
  | { kind: 'all' }
  | { kind: 'range'; start: IsoDate; end: IsoDate }

export interface Range {
  start: IsoDate
  end: IsoDate
}

const iso = (d: Date) => toIsoDate(d)
const sundayOf = (date: IsoDate) =>
  iso(addDays(mondayOf(parseIsoDate(date)), 6))

/**
 * Intervallo di date del periodo.
 * - Ultime N settimane: da N−1 lunedì fa alla domenica di questa settimana.
 * - Tutto: dalla settimana della prima seduta a quella dell'ultima (almeno fino a oggi).
 * - Fase o blocco: le sue date.
 */
export function resolveRange(
  period: Period,
  sessions: Session[],
  today: IsoDate,
): Range {
  if (period.kind === 'range') return { start: period.start, end: period.end }
  const thisMonday = mondayOf(parseIsoDate(today))
  if (period.kind === 'weeks') {
    return {
      start: iso(addDays(thisMonday, -7 * (period.weeks - 1))),
      end: iso(addDays(thisMonday, 6)),
    }
  }
  if (sessions.length === 0) {
    return { start: iso(thisMonday), end: iso(addDays(thisMonday, 6)) }
  }
  let first = sessions[0].date
  let last = today
  for (const s of sessions) {
    if (s.date < first) first = s.date
    if (s.date > last) last = s.date
  }
  return { start: iso(mondayOf(parseIsoDate(first))), end: sundayOf(last) }
}

/** Un intervallo dell'asse: un giorno o una settimana (lunedì–domenica). */
export interface Bucket {
  start: IsoDate
  end: IsoDate
}

export type Granularity = 'day' | 'week'

/** Fino a 4 settimane l'asse è per giorno, oltre per settimana. */
export const granularityOf = (r: Range): Granularity =>
  daysBetween(r.start, r.end) + 1 <= 28 ? 'day' : 'week'

export function bucketsOf(
  r: Range,
  g: Granularity = granularityOf(r),
): Bucket[] {
  const out: Bucket[] = []
  if (g === 'day') {
    for (let d = parseIsoDate(r.start); iso(d) <= r.end; d = addDays(d, 1)) {
      out.push({ start: iso(d), end: iso(d) })
    }
    return out
  }
  for (
    let m = mondayOf(parseIsoDate(r.start));
    iso(m) <= r.end;
    m = addDays(m, 7)
  ) {
    out.push({ start: iso(m), end: iso(addDays(m, 6)) })
  }
  return out
}

const inBucket = (sessions: Session[], b: Bucket) =>
  sessions.filter((s) => s.date >= b.start && s.date <= b.end)

export type SportTime = Record<Sport, { plannedS: number; actualS: number }>

/** Ore previste ed eseguite per disciplina in ogni intervallo (brick diviso per frazione). */
export function timeSeries(
  sessions: Session[],
  buckets: Bucket[],
): SportTime[] {
  return buckets.map((b) => loadByDiscipline(inBucket(sessions, b)))
}

export type SportDistance = Record<
  EnduranceDiscipline,
  { plannedM: number; actualM: number }
>

const emptyDistance = (): SportDistance =>
  Object.fromEntries(
    ENDURANCE.map((d) => [d, { plannedM: 0, actualM: 0 }]),
  ) as SportDistance

/**
 * Distanza prevista ed eseguita per sport. Le saltate non contano nel previsto;
 * l'eseguito conta solo per le sedute svolte. I brick si dividono per frazione.
 */
export function distanceBySport(sessions: Session[]): SportDistance {
  const out = emptyDistance()
  for (const s of sessions) {
    if (s.discipline === 'strength') continue
    const counts = s.status !== 'skipped'
    const done = s.status === 'done'
    if (s.discipline === 'brick') {
      if (counts) {
        for (const leg of s.plan.legs) {
          out[leg.discipline].plannedM += legTotals(leg).distanceM ?? 0
        }
      }
      if (done && s.actual) {
        const by = brickActualTotals(s.actual).distanceBySport
        for (const d of ENDURANCE) out[d].actualM += by[d] ?? 0
      }
      continue
    }
    if (counts) {
      out[s.discipline].plannedM +=
        templateTotals({ discipline: s.discipline, ...s.plan }).distanceM ?? 0
    }
    if (done && s.actual) {
      out[s.discipline].actualM += s.actual.distanceM ?? 0
    }
  }
  return out
}

export function distanceSeries(
  sessions: Session[],
  buckets: Bucket[],
): SportDistance[] {
  return buckets.map((b) => distanceBySport(inBucket(sessions, b)))
}

/** Somma di una serie di totali per disciplina. */
export function sumTime(series: SportTime[]): SportTime {
  const out = Object.fromEntries(
    DISCIPLINES.map((d) => [d, { plannedS: 0, actualS: 0 }]),
  ) as SportTime
  for (const x of series) {
    for (const d of DISCIPLINES) {
      out[d].plannedS += x[d].plannedS
      out[d].actualS += x[d].actualS
    }
  }
  return out
}

export function sumDistance(series: SportDistance[]): SportDistance {
  const out = emptyDistance()
  for (const x of series) {
    for (const d of ENDURANCE) {
      out[d].plannedM += x[d].plannedM
      out[d].actualM += x[d].actualM
    }
  }
  return out
}

/** Massimo "tondo" per l'asse: 1, 2 o 5 × 10ⁿ, con al più 5 linee. */
export function niceMax(v: number): { max: number; step: number } {
  if (v <= 0) return { max: 1, step: 0.25 }
  const raw = v / 4
  const p = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw)!
  return { max: Math.ceil(v / step) * step, step }
}

// ---------- scelta del periodo (filtro dell'Analisi) ----------

/** Voce del Piano selezionabile: una fase o un blocco applicati, oppure un blocco dentro una fase. */
export interface PlanEntry {
  /** `a:<applicazione>` oppure `r:<gruppo di settimane>`. */
  value: string
  level: 'app' | 'run'
  kind: 'phase' | 'block'
  name: string
  start: IsoDate
  end: IsoDate
  timing: Timing
  /** Per i blocchi dentro una fase: la voce della fase. */
  parent?: string
}

/** Le voci del Piano in ordine di data: ogni fase seguita dai suoi blocchi. */
export function planEntries(items: PlanItem[]): PlanEntry[] {
  return items.flatMap((item) => {
    const a = item.application
    const head: PlanEntry = {
      value: `a:${a.id}`,
      level: 'app',
      kind: a.kind,
      name: a.name,
      start: item.start,
      end: item.end,
      timing: item.timing,
    }
    if (a.kind !== 'phase') return [head]
    return [
      head,
      ...item.runs.map((r): PlanEntry => ({
        value: `r:${r.key}`,
        level: 'run',
        kind: 'block',
        name: r.blockName,
        start: r.start,
        end: r.end,
        timing: r.timing,
        parent: head.value,
      })),
    ]
  })
}

export const PRESET_WEEKS = [4, 12, 26] as const

/** Quello che l'utente ha scelto nel filtro. */
export type PeriodChoice =
  | { kind: 'weeks'; weeks: number; offset: number }
  | { kind: 'year'; year: number }
  | { kind: 'all' }
  | { kind: 'plan'; value: string }
  | { kind: 'custom'; start: IsoDate; end: IsoDate }

export const DEFAULT_CHOICE: PeriodChoice = {
  kind: 'weeks',
  weeks: 12,
  offset: 0,
}

const shiftIso = (d: IsoDate, days: number) =>
  iso(addDays(parseIsoDate(d), days))

/** Il periodo da calcolare; una voce del Piano sparita torna al predefinito. */
export function choiceToPeriod(
  c: PeriodChoice,
  entries: PlanEntry[],
  today: IsoDate,
): Period {
  switch (c.kind) {
    case 'weeks': {
      const r = resolveRange({ kind: 'weeks', weeks: c.weeks }, [], today)
      const days = 7 * c.weeks * c.offset
      return {
        kind: 'range',
        start: shiftIso(r.start, days),
        end: shiftIso(r.end, days),
      }
    }
    case 'year':
      return { kind: 'range', start: `${c.year}-01-01`, end: `${c.year}-12-31` }
    case 'all':
      return { kind: 'all' }
    case 'custom':
      return { kind: 'range', start: c.start, end: c.end }
    case 'plan': {
      const e = entries.find((x) => x.value === c.value)
      return e
        ? { kind: 'range', start: e.start, end: e.end }
        : choiceToPeriod(DEFAULT_CHOICE, entries, today)
    }
  }
}

/**
 * La scelta spostata di un passo (`dir` = −1 indietro, +1 avanti), oppure
 * `null` se non ci si può spostare (Tutto, primo o ultimo elemento del Piano).
 * Dal Piano ci si sposta tra voci dello stesso livello (fase ↔ fase, blocco ↔ blocco).
 */
export function shiftChoice(
  c: PeriodChoice,
  dir: -1 | 1,
  entries: PlanEntry[],
): PeriodChoice | null {
  switch (c.kind) {
    case 'weeks':
      return { ...c, offset: c.offset + dir }
    case 'year':
      return { ...c, year: c.year + dir }
    case 'all':
      return null
    case 'custom': {
      const len = daysBetween(c.start, c.end) + 1
      return {
        kind: 'custom',
        start: shiftIso(c.start, dir * len),
        end: shiftIso(c.end, dir * len),
      }
    }
    case 'plan': {
      const cur = entries.find((x) => x.value === c.value)
      if (!cur) return null
      const same = entries.filter((x) => x.level === cur.level)
      const next = same[same.indexOf(cur) + dir]
      return next ? { kind: 'plan', value: next.value } : null
    }
  }
}

const isIso = (v: unknown): v is IsoDate =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Scelta salvata sul dispositivo (JSON), se valida. */
export function parseChoice(text: string | null): PeriodChoice | null {
  if (!text) return null
  let v: unknown
  try {
    v = JSON.parse(text)
  } catch {
    return null
  }
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (
    o.kind === 'weeks' &&
    typeof o.weeks === 'number' &&
    (PRESET_WEEKS as readonly number[]).includes(o.weeks)
  )
    return { kind: 'weeks', weeks: o.weeks, offset: 0 }
  if (o.kind === 'year' && Number.isInteger(o.year))
    return { kind: 'year', year: o.year as number }
  if (o.kind === 'all') return { kind: 'all' }
  if (o.kind === 'plan' && typeof o.value === 'string')
    return { kind: 'plan', value: o.value }
  if (o.kind === 'custom' && isIso(o.start) && isIso(o.end) && o.start <= o.end)
    return { kind: 'custom', start: o.start, end: o.end }
  return null
}
