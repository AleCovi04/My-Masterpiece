import type {
  EnduranceDiscipline,
  EnduranceItem,
  EnduranceSimple,
  EnduranceStep,
  EnduranceTemplate,
  RepeatBlock,
  WorkoutTemplate,
} from '../data/types'
import { formatDuration } from './format'

// ---------- lettura e scrittura dei valori ----------

/** "4:30" → 270 s, "1:05:00" → 3900 s, "15" → 15 minuti. `null` se non valido o zero. */
export function parseClock(raw: string): number | null {
  const v = raw.trim()
  let sec: number
  let m = v.match(/^(\d{1,3})$/)
  if (m) sec = Number(m[1]) * 60
  else if ((m = v.match(/^(\d{1,3}):([0-5]\d)$/)))
    sec = Number(m[1]) * 60 + Number(m[2])
  else if ((m = v.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/)))
    sec = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
  else return null
  return sec > 0 ? sec : null
}

/** 270 → "4:30", 3900 → "1:05:00". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Numero positivo con al massimo due decimali (virgola o punto). */
export function parseDecimal(raw: string): number | null {
  const v = raw.trim().replace(',', '.')
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(v)) return null
  const n = Number(v)
  return n > 0 ? n : null
}

export type DistUnit = 'm' | 'km'

/** Distanza digitata + unità → metri (1 m – 1000 km). */
export function parseDistanceM(raw: string, unit: DistUnit): number | null {
  const n = parseDecimal(raw)
  if (n === null) return null
  const m = Math.round(unit === 'km' ? n * 1000 : n)
  return m >= 1 && m <= 1_000_000 ? m : null
}

/** Metri → testo e unità per il campo: 10000 → "10" km, 400 → "400" m. */
export function distanceDraft(m: number): { text: string; unit: DistUnit } {
  return m >= 1000 && m % 10 === 0
    ? { text: String(+(m / 1000).toFixed(2)), unit: 'km' }
    : { text: String(m), unit: 'm' }
}

/** Intensità digitata: bici km/h decimali, corsa e nuoto passo m:ss. */
export function parseIntensity(
  raw: string,
  d: EnduranceDiscipline,
): number | null {
  return d === 'bike' ? parseDecimal(raw) : parseClock(raw)
}

export function intensityText(v: number, d: EnduranceDiscipline): string {
  return d === 'bike' ? String(v) : formatClock(v)
}

/** "5:30/km", "1:45/100 m", "28 km/h". */
export function formatIntensity(v: number, d: EnduranceDiscipline): string {
  if (d === 'bike') return `${v} km/h`
  return `${formatClock(v)}/${d === 'run' ? 'km' : '100 m'}`
}

export const intensityUnit = (d: EnduranceDiscipline): string =>
  d === 'bike' ? 'km/h' : d === 'run' ? 'min/km' : 'min/100 m'

// ---------- distanza ↔ tempo ----------

/** Metri al secondo. */
export function speedMps(d: EnduranceDiscipline, intensity: number): number {
  if (d === 'run') return 1000 / intensity
  if (d === 'swim') return 100 / intensity
  return intensity / 3.6
}

const durationOf = (
  d: EnduranceDiscipline,
  distanceM: number,
  intensity: number,
) => Math.round(distanceM / speedMps(d, intensity))

const distanceOf = (
  d: EnduranceDiscipline,
  durationS: number,
  intensity: number,
) => Math.round(durationS * speedMps(d, intensity))

export interface Stats {
  distanceM: number | null
  durationS: number | null
}

/** Distanza e tempo di un passo, dove calcolabili. */
export function stepStats(
  d: EnduranceDiscipline,
  s: Pick<EnduranceStep, 'distanceM' | 'durationS' | 'intensity'>,
): Stats {
  if (s.distanceM !== undefined) {
    return {
      distanceM: s.distanceM,
      durationS:
        s.intensity !== undefined
          ? durationOf(d, s.distanceM, s.intensity)
          : null,
    }
  }
  if (s.durationS !== undefined) {
    return {
      distanceM:
        s.intensity !== undefined
          ? distanceOf(d, s.durationS, s.intensity)
          : null,
      durationS: s.durationS,
    }
  }
  return { distanceM: null, durationS: null }
}

export interface Totals {
  distanceM: number
  durationS: number
  /** Falso se qualche passo non ha il dato: il totale vale solo per la parte nota. */
  distanceComplete: boolean
  durationComplete: boolean
}

/** Totali di passi e blocchi (i blocchi contano N volte). */
export function itemsTotals(
  d: EnduranceDiscipline,
  items: EnduranceItem[],
): Totals {
  const t: Totals = {
    distanceM: 0,
    durationS: 0,
    distanceComplete: items.length > 0,
    durationComplete: items.length > 0,
  }
  for (const it of items) {
    const steps = it.kind === 'repeat' ? it.steps : [it]
    const times = it.kind === 'repeat' ? it.times : 1
    for (const s of steps) {
      const st = stepStats(d, s)
      if (st.distanceM === null) t.distanceComplete = false
      else t.distanceM += st.distanceM * times
      if (st.durationS === null) t.durationComplete = false
      else t.durationS += st.durationS * times
    }
  }
  return t
}

export function simpleStats(d: EnduranceDiscipline, s: EnduranceSimple): Stats {
  return stepStats(
    d,
    s.goal === 'distance'
      ? { distanceM: s.distanceM, intensity: s.intensity }
      : { durationS: s.durationS, intensity: s.intensity },
  )
}

/** Totali di un template endurance (`null` se un totale non è noto) e se valgono per tutti i passi. */
export function templateTotals(
  t: EnduranceTemplate,
): Stats & { distanceComplete: boolean; durationComplete: boolean } {
  if (t.mode === 'simple') {
    const st = t.simple
      ? simpleStats(t.discipline, t.simple)
      : { distanceM: null, durationS: null }
    return { ...st, distanceComplete: true, durationComplete: true }
  }
  const tot = itemsTotals(t.discipline, t.items ?? [])
  return {
    distanceM: tot.distanceM > 0 ? tot.distanceM : null,
    durationS: tot.durationS > 0 ? tot.durationS : null,
    distanceComplete: tot.distanceComplete,
    durationComplete: tot.durationComplete,
  }
}

/** Durata mostrata: quella scritta a mano, altrimenti quella calcolata. */
export function templateDurationSec(t: WorkoutTemplate): number | null {
  if (t.estimatedDurationSec) return t.estimatedDurationSec
  return t.discipline === 'strength' ? null : templateTotals(t).durationS
}

// ---------- testo ----------

export function formatDist(m: number, d: EnduranceDiscipline): string {
  if (d === 'swim' || m < 1000) return `${m} m`
  return `${+(m / 1000).toFixed(2)} km`
}

/** 900 → "15′", 90 → "1′30″", 45 → "45″". */
export function formatShortTime(s: number): string {
  if (s >= 3600) return formatDuration(s)
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m === 0) return `${sec}″`
  return sec === 0 ? `${m}′` : `${m}′${String(sec).padStart(2, '0')}″`
}

const amount = (s: EnduranceStep, d: EnduranceDiscipline): string =>
  s.distanceM !== undefined
    ? formatDist(s.distanceM, d)
    : formatShortTime(s.durationS ?? 0)

export interface TypeLabels {
  warmup: string
  recovery: string
  cooldown: string
}

/** "Risc. 15′ · 6×400 m · Def. 10′". Nel blocco contano i passi di lavoro. */
export function structureSummary(
  items: EnduranceItem[],
  d: EnduranceDiscipline,
  labels: TypeLabels,
): string {
  const one = (s: EnduranceStep) =>
    s.type === 'work' ? amount(s, d) : `${labels[s.type]} ${amount(s, d)}`
  return items
    .map((it) => {
      if (it.kind === 'step') return one(it)
      const work = it.steps.filter((s) => s.type === 'work')
      const shown = work.length > 0 ? work : it.steps
      return `${it.times}×${shown.map((s) => amount(s, d)).join(' + ')}`
    })
    .join(' · ')
}

// ---------- alberi di passi e blocchi ----------

/** Dove inserire: in un blocco (`parentId`) o nella radice (`null`), alla posizione `index` della lista senza l'elemento spostato. */
export interface DropTarget {
  parentId: string | null
  index: number
}

/** Toglie i blocchi rimasti senza passi. */
export function pruneEmpty(items: EnduranceItem[]): EnduranceItem[] {
  return items.filter((it) => it.kind === 'step' || it.steps.length > 0)
}

export function moveNode(
  items: EnduranceItem[],
  id: string,
  target: DropTarget,
): EnduranceItem[] {
  let moved: EnduranceItem | undefined
  const without = items.flatMap((it): EnduranceItem[] => {
    if (it.id === id) {
      moved = it
      return []
    }
    if (it.kind === 'repeat' && it.steps.some((s) => s.id === id)) {
      moved = it.steps.find((s) => s.id === id)
      return [{ ...it, steps: it.steps.filter((s) => s.id !== id) }]
    }
    return [it]
  })
  if (!moved) return items
  if (target.parentId === null) {
    const at = Math.max(0, Math.min(target.index, without.length))
    return pruneEmpty([...without.slice(0, at), moved, ...without.slice(at)])
  }
  // un blocco non entra in un altro blocco
  if (moved.kind === 'repeat') return items
  const step = moved
  return pruneEmpty(
    without.map((it) => {
      if (it.kind !== 'repeat' || it.id !== target.parentId) return it
      const at = Math.max(0, Math.min(target.index, it.steps.length))
      return {
        ...it,
        steps: [...it.steps.slice(0, at), step, ...it.steps.slice(at)],
      }
    }),
  )
}

/** Sposta di una posizione (±1) restando nello stesso contenitore. */
export function shiftNode(
  items: EnduranceItem[],
  id: string,
  dir: -1 | 1,
): EnduranceItem[] {
  const swap = <T>(list: T[], i: number): T[] => {
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return list
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  }
  const at = items.findIndex((it) => it.id === id)
  if (at >= 0) return swap(items, at)
  return items.map((it) =>
    it.kind === 'repeat' && it.steps.some((s) => s.id === id)
      ? {
          ...it,
          steps: swap(
            it.steps,
            it.steps.findIndex((s) => s.id === id),
          ),
        }
      : it,
  )
}

/** Scioglie un blocco: i suoi passi restano al suo posto, una volta sola. */
export function dissolveBlock(
  items: EnduranceItem[],
  id: string,
): EnduranceItem[] {
  return items.flatMap((it) =>
    it.kind === 'repeat' && it.id === id ? it.steps : [it],
  )
}

/** Mette un passo della radice dentro un nuovo blocco "Ripeti N volte". */
export function wrapStep(
  items: EnduranceItem[],
  id: string,
  blockId: string,
  times = 2,
): EnduranceItem[] {
  return items.map((it) =>
    it.kind === 'step' && it.id === id
      ? ({ kind: 'repeat', id: blockId, times, steps: [it] } as RepeatBlock)
      : it,
  )
}

/** Toglie un passo o un blocco; i blocchi vuoti spariscono. */
export function removeNode(
  items: EnduranceItem[],
  id: string,
): EnduranceItem[] {
  return pruneEmpty(
    items
      .filter((it) => it.id !== id)
      .map((it) =>
        it.kind === 'repeat'
          ? { ...it, steps: it.steps.filter((s) => s.id !== id) }
          : it,
      ),
  )
}
