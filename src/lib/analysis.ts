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
type Period = { kind: 'all' } | { kind: 'range'; start: IsoDate; end: IsoDate }

export interface Range {
  start: IsoDate
  end: IsoDate
}

const iso = (d: Date) => toIsoDate(d)
const sundayOf = (date: IsoDate) =>
  iso(addDays(mondayOf(parseIsoDate(date)), 6))

/**
 * Intervallo di date del periodo.
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

/** Un intervallo dell'asse: un giorno o una settimana (7 giorni). */
export interface Bucket {
  start: IsoDate
  end: IsoDate
}

export type Granularity = 'day' | 'week'

/** Scelta automatica: fino a 4 settimane l'asse è per giorno, oltre per settimana. */
export const granularityOf = (r: Range): Granularity =>
  daysBetween(r.start, r.end) + 1 <= 28 ? 'day' : 'week'

/**
 * Intervalli dell'asse. Per settimana: blocchi di 7 giorni contati a ritroso
 * dall'ultimo giorno (un periodo da lunedì a domenica dà settimane lunedì–domenica,
 * "ultime 6 settimane" dà settimane che finiscono oggi); il primo può essere più corto.
 */
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
  for (let e = parseIsoDate(r.end); iso(e) >= r.start; e = addDays(e, -7)) {
    const start = iso(addDays(e, -6))
    out.unshift({ start: start < r.start ? r.start : start, end: iso(e) })
  }
  return out
}

const inBucket = (sessions: Session[], b: Bucket) =>
  sessions.filter((s) => s.date >= b.start && s.date <= b.end)

type SportTime = Record<Sport, { plannedS: number; actualS: number }>

/** Ore previste ed eseguite per disciplina in ogni intervallo (brick diviso per frazione). */
export function timeSeries(
  sessions: Session[],
  buckets: Bucket[],
): SportTime[] {
  return buckets.map((b) => loadByDiscipline(inBucket(sessions, b)))
}

type SportDistance = Record<
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

/**
 * Scala dell'asse Y: il massimo è appena sopra il valore più alto (+8 %),
 * le linee della griglia cadono su passi "tondi" (1, 2, 2,5 o 5 × 10ⁿ), al più 4.
 */
export function axisScale(
  v: number,
  headroom = 0.08,
): { max: number; step: number; lines: number[] } {
  if (v <= 0) return { max: 1, step: 0.5, lines: [0, 0.5, 1] }
  const max = v * (1 + headroom)
  const raw = max / 4
  const p = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= raw)!
  const lines: number[] = []
  for (let k = 0; k * step <= max + 1e-9; k++)
    lines.push(+(k * step).toFixed(10))
  return { max, step, lines }
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

export type LastUnit = 'week' | 'month' | 'year'
export const LAST_UNITS: LastUnit[] = ['week', 'month', 'year']
/** Massimo inseribile per unità. */
export const LAST_MAX: Record<LastUnit, number> = {
  week: 260,
  month: 120,
  year: 20,
}

/** Quello che l'utente ha scelto nel filtro. */
export type PeriodChoice =
  /** Ultime N settimane/mesi/anni fino a oggi; `offset` = quanti periodi uguali indietro (−) o avanti (+). */
  | { kind: 'last'; unit: LastUnit; n: number; offset: number }
  | { kind: 'all' }
  | { kind: 'plan'; value: string }
  | { kind: 'custom'; start: IsoDate; end: IsoDate }

export const DEFAULT_CHOICE: PeriodChoice = {
  kind: 'last',
  unit: 'week',
  n: 12,
  offset: 0,
}

/** Stessa data `k` mesi dopo (o prima); se il giorno non esiste, l'ultimo del mese. */
export function addMonthsIso(d: IsoDate, k: number): IsoDate {
  const [y, m, day] = d.split('-').map(Number)
  const total = y * 12 + (m - 1) + k
  const ny = Math.floor(total / 12)
  const nm = total - ny * 12
  const last = new Date(ny, nm + 1, 0).getDate()
  return iso(new Date(ny, nm, Math.min(day, last)))
}

/**
 * Intervallo delle ultime N unità che finisce oggi (spostato di `offset` periodi):
 * 6 settimane = 42 giorni fino a oggi; 3 mesi = dal giorno dopo la stessa data di 3 mesi fa.
 */
function lastRange(
  unit: LastUnit,
  n: number,
  offset: number,
  today: IsoDate,
): Range {
  if (unit === 'week') {
    const end = shiftIso(today, 7 * n * offset)
    return { start: shiftIso(end, -7 * n + 1), end }
  }
  const months = unit === 'month' ? n : 12 * n
  const end = addMonthsIso(today, months * offset)
  return { start: shiftIso(addMonthsIso(end, -months), 1), end }
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
    case 'last':
      return { kind: 'range', ...lastRange(c.unit, c.n, c.offset, today) }
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
    case 'last':
      return { ...c, offset: c.offset + dir }
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
    o.kind === 'last' &&
    LAST_UNITS.includes(o.unit as LastUnit) &&
    Number.isInteger(o.n) &&
    (o.n as number) >= 1 &&
    (o.n as number) <= LAST_MAX[o.unit as LastUnit]
  )
    return {
      kind: 'last',
      unit: o.unit as LastUnit,
      n: o.n as number,
      offset: 0,
    }
  // scelte delle versioni precedenti del filtro
  if (
    o.kind === 'weeks' &&
    Number.isInteger(o.weeks) &&
    (o.weeks as number) >= 1
  )
    return {
      kind: 'last',
      unit: 'week',
      n: Math.min(o.weeks as number, LAST_MAX.week),
      offset: 0,
    }
  if (o.kind === 'year' && Number.isInteger(o.year))
    return { kind: 'custom', start: `${o.year}-01-01`, end: `${o.year}-12-31` }
  if (o.kind === 'all') return { kind: 'all' }
  if (o.kind === 'plan' && typeof o.value === 'string')
    return { kind: 'plan', value: o.value }
  if (o.kind === 'custom' && isIso(o.start) && isIso(o.end) && o.start <= o.end)
    return { kind: 'custom', start: o.start, end: o.end }
  return null
}
