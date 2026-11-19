// Calcoli sui campioni di un'attività: tempo in movimento, parziali, zone,
// potenza normalizzata, migliori prestazioni, serie per i grafici.
import type { EnduranceDiscipline } from '../../data/types'
import type { FitPoint } from './types'

/** Oltre questo intervallo tra due campioni il cronometro era in pausa. */
const MAX_GAP_S = 15
/** Sotto questa velocità si è fermi (m/s). */
const STILL_MPS = 0.3

/** Secondi "in movimento" tra il campione i−1 e i (0 se in pausa o fermi). */
function movingDt(a: FitPoint, b: FitPoint): number {
  const dt = b.t - a.t
  if (dt <= 0 || dt > MAX_GAP_S) return 0
  if (b.v !== undefined && b.v < STILL_MPS) return 0
  return dt
}

/** Secondi tra due campioni con il cronometro attivo (fermi compresi). */
function activeDt(a: FitPoint, b: FitPoint): number {
  const dt = b.t - a.t
  return dt > 0 && dt <= MAX_GAP_S ? dt : 0
}

export function movingTime(points: FitPoint[]): number {
  let s = 0
  for (let i = 1; i < points.length; i++)
    s += movingDt(points[i - 1], points[i])
  return Math.round(s)
}

const avg = (values: number[]) =>
  values.length
    ? values.reduce((sum, v) => sum + v, 0) / values.length
    : undefined

export interface Split {
  /** Numero del parziale, da 1. */
  n: number
  distanceM: number
  durationS: number
  avgHr?: number
  avgPowerW?: number
  /** Quota finale − iniziale. */
  elevationM?: number
}

/** Lunghezza del parziale: 1 km corsa, 5 km bici, 100 m nuoto. */
export const splitLength = (d: EnduranceDiscipline) =>
  d === 'run' ? 1000 : d === 'bike' ? 5000 : 100

/** Parziali a distanza fissa (l'ultimo può essere più corto, se > 10 % del parziale). */
export function splits(points: FitPoint[], length: number): Split[] {
  const out: Split[] = []
  let time = 0
  let hr: number[] = []
  let pw: number[] = []
  const startD = points.find((p) => p.d !== undefined)?.d ?? 0
  let mark = startD + length
  let prevD = startD
  let startAlt = points[0]?.alt
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    time += movingDt(points[i - 1], p)
    if (p.hr !== undefined) hr.push(p.hr)
    if (p.pw !== undefined) pw.push(p.pw)
    if (p.d !== undefined) prevD = p.d
    const last = i === points.length - 1
    if ((p.d !== undefined && p.d >= mark) || last) {
      const distance =
        last && !(p.d !== undefined && p.d >= mark)
          ? prevD - (mark - length)
          : length
      if (distance >= length * 0.1 && time > 0)
        out.push({
          n: out.length + 1,
          distanceM: Math.round(distance),
          durationS: Math.round(time),
          avgHr: hr.length ? Math.round(avg(hr)!) : undefined,
          avgPowerW: pw.length ? Math.round(avg(pw)!) : undefined,
          elevationM:
            p.alt !== undefined && startAlt !== undefined
              ? Math.round(p.alt - startAlt)
              : undefined,
        })
      time = 0
      hr = []
      pw = []
      mark += length
      startAlt = p.alt
    }
  }
  return out
}

/** Valori al secondo (il campione precedente vale fino al successivo; le pause non contano). */
function perSecond(points: FitPoint[], field: 'pw' | 'hr'): number[] {
  const out: number[] = []
  for (let i = 1; i < points.length; i++) {
    const dt = Math.round(activeDt(points[i - 1], points[i]))
    const v = points[i][field] ?? 0
    for (let k = 0; k < dt; k++) out.push(v)
  }
  return out
}

/** Potenza normalizzata (media mobile di 30 s, alla quarta); servono almeno 30 s di dati. */
export function normalizedPower(points: FitPoint[]): number | undefined {
  if (!points.some((p) => p.pw !== undefined)) return undefined
  const s = perSecond(points, 'pw')
  if (s.length < 30) return undefined
  let sum = 0
  for (let i = 0; i < 30; i++) sum += s[i]
  let acc = 0
  let n = 0
  for (let i = 30; i <= s.length; i++) {
    acc += (sum / 30) ** 4
    n += 1
    if (i < s.length) sum += s[i] - s[i - 30]
  }
  return Math.round((acc / n) ** 0.25)
}

/** Secondi in ogni zona; `bounds` = limiti superiori delle zone (n−1 per n zone). */
export function timeInZones(
  points: FitPoint[],
  field: 'hr' | 'pw',
  bounds: number[],
): number[] {
  const out = new Array<number>(bounds.length + 1).fill(0)
  for (let i = 1; i < points.length; i++) {
    const v = points[i][field]
    if (v === undefined) continue
    const dt = activeDt(points[i - 1], points[i])
    let z = bounds.findIndex((b) => v <= b)
    if (z < 0) z = bounds.length
    out[z] += dt
  }
  return out.map(Math.round)
}

/** 5 zone di FC: % della massima (o della riserva, con la FC a riposo): 60/70/80/90. */
export function hrZoneBounds(maxHr: number, restHr?: number): number[] {
  const base = restHr && restHr < maxHr ? restHr : 0
  return [0.6, 0.7, 0.8, 0.9].map((p) => Math.round(base + (maxHr - base) * p))
}

/** 7 zone di potenza (Coggan) dall'FTP. */
export const powerZoneBounds = (ftp: number) =>
  [0.55, 0.75, 0.9, 1.05, 1.2, 1.5].map((p) => Math.round(ftp * p))

export interface BestEffort {
  /** Metri (corsa) o secondi (potenza). */
  target: number
  /** Secondi impiegati (corsa) o watt medi (potenza). */
  value: number
}

export const RUN_EFFORTS = [400, 1000, 5000, 10000, 21097.5, 42195]
export const POWER_EFFORTS = [5, 60, 300, 1200, 3600]

/** Tempo più breve per coprire ciascuna distanza (interpolato tra i campioni). */
export function bestRunEfforts(points: FitPoint[]): BestEffort[] {
  const pts = points.filter((p) => p.d !== undefined) as (FitPoint & {
    d: number
  })[]
  if (pts.length < 2) return []
  const total = pts[pts.length - 1].d - pts[0].d
  const out: BestEffort[] = []
  for (const target of RUN_EFFORTS) {
    if (target > total) break
    let best = Infinity
    let j = 0
    for (let i = 0; i < pts.length; i++) {
      while (j < pts.length && pts[j].d - pts[i].d < target) j++
      if (j >= pts.length) break
      // interpolazione sull'ultimo tratto
      const a = pts[j - 1]
      const b = pts[j]
      const need = pts[i].d + target
      const f = b.d > a.d ? (need - a.d) / (b.d - a.d) : 1
      const t = a.t + (b.t - a.t) * f - pts[i].t
      if (t < best) best = t
    }
    if (best < Infinity) out.push({ target, value: Math.round(best) })
  }
  return out
}

/** Potenza media massima su ciascuna durata. */
export function bestPowerEfforts(points: FitPoint[]): BestEffort[] {
  if (!points.some((p) => p.pw !== undefined)) return []
  const s = perSecond(points, 'pw')
  const out: BestEffort[] = []
  for (const target of POWER_EFFORTS) {
    if (target > s.length) break
    let sum = 0
    for (let i = 0; i < target; i++) sum += s[i]
    let best = sum
    for (let i = target; i < s.length; i++) {
      sum += s[i] - s[i - target]
      if (sum > best) best = sum
    }
    out.push({ target, value: Math.round(best / target) })
  }
  return out
}

export type SeriesField =
  'pace' | 'speed' | 'hr' | 'alt' | 'cad' | 'pw' | 'temp'

export interface SeriesPoint {
  /** Secondi dall'inizio della frazione o metri, secondo l'asse scelto. */
  x: number
  y: number
  /** Indice del campione (per il cursore sulla mappa). */
  i: number
}

const value = (p: FitPoint, field: SeriesField): number | undefined => {
  switch (field) {
    case 'pace':
      // secondi al km; fermi = nessun valore
      return p.v !== undefined && p.v >= STILL_MPS ? 1000 / p.v : undefined
    case 'speed':
      return p.v !== undefined ? p.v * 3.6 : undefined
    default:
      return p[field]
  }
}

/**
 * Serie per un grafico, ridotta a circa `maxPoints` punti (media per gruppi
 * di campioni). `offset` = indice del primo campione della frazione.
 */
export function series(
  points: FitPoint[],
  field: SeriesField,
  axis: 'time' | 'distance',
  maxPoints = 600,
  offset = 0,
): SeriesPoint[] {
  if (!points.length) return []
  const t0 = points[0].t
  const d0 = points.find((p) => p.d !== undefined)?.d ?? 0
  const step = Math.max(1, Math.ceil(points.length / maxPoints))
  const out: SeriesPoint[] = []
  for (let i = 0; i < points.length; i += step) {
    const group = points.slice(i, i + step)
    const ys = group
      .map((p) => value(p, field))
      .filter((v): v is number => v !== undefined)
    const mid = group[Math.floor(group.length / 2)]
    const x =
      axis === 'time'
        ? mid.t - t0
        : mid.d !== undefined
          ? mid.d - d0
          : undefined
    if (!ys.length || x === undefined) continue
    out.push({ x, y: avg(ys)!, i: offset + i + Math.floor(group.length / 2) })
  }
  return out
}

/** Il campo ha abbastanza dati per un grafico (almeno il 20 % dei campioni)? */
export function hasField(points: FitPoint[], field: SeriesField): boolean {
  if (!points.length) return false
  const n = points.filter((p) => value(p, field) !== undefined).length
  return n >= Math.max(2, points.length * 0.2)
}
