import type { IsoDate } from '../data/types'

const pad = (n: number) => String(n).padStart(2, '0')

/** Data locale → "YYYY-MM-DD". */
export function toIsoDate(d: Date): IsoDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "YYYY-MM-DD" → Date a mezzanotte locale. */
export function parseIsoDate(s: IsoDate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isIsoDate(s: unknown): s is IsoDate {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export const todayIso = (): IsoDate => toIsoDate(new Date())

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() + n)
  return x
}

/** Lunedì della settimana che contiene la data. */
export function mondayOf(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7))
}

/** Giorni di calendario da a a b (negativo se b precede a). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round(
    (parseIsoDate(b).getTime() - parseIsoDate(a).getTime()) / 864e5,
  )
}
