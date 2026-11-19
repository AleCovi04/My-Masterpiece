import type { Discipline, IsoDate } from '../data/types'
import { parseIsoDate } from './dates'

/** 5400 → "1h30", 3600 → "1h", 2700 → "45 min", 0 → "0h". */
export function formatDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60)
  if (totalMin <= 0) return '0h'
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** 5400 → "1:30", 2700 → "0:45". */
export function formatHm(seconds: number): string {
  const totalMin = Math.max(0, Math.round(seconds / 60))
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, '0')}`
}

/** Nuoto in metri, altre discipline in km. */
export function formatDistance(meters: number, discipline: Discipline): string {
  if (discipline === 'swim') return `${Math.round(meters)} m`
  return `${+(meters / 1000).toFixed(2)} km`
}

/** "2028-08-20" → "20 ago 2028" (mesi abbreviati dal dizionario). */
export function formatLongDate(iso: IsoDate, monthsShort: string[]): string {
  const d = parseIsoDate(iso)
  return `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`
}

/** Ore decimali compatte: 1.5 → "1.5h", 2.333 → "2.33h". */
export const formatHoursShort = (h: number) => `${+h.toFixed(2)}h`
