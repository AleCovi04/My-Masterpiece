import type { IsoDate } from '../../data/types'
import type { Dictionary } from '../../i18n/it'
import { addDays, mondayOf, parseIsoDate, toIsoDate } from '../../lib/dates'

export type CalendarView = 'week' | 'month' | 'year'

type Names = Pick<Dictionary, 'monthsShort' | 'monthsLong' | 'weekdaysLong'>

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** I 7 giorni (lunedì → domenica) della settimana che contiene `anchor`. */
export function weekDates(anchor: IsoDate): IsoDate[] {
  const monday = mondayOf(parseIsoDate(anchor))
  return Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(monday, i)))
}

/** Sposta il periodo di `k` unità della vista (settimana, mese o anno). */
export function shiftAnchor(
  view: CalendarView,
  anchor: IsoDate,
  k: number,
): IsoDate {
  const d = parseIsoDate(anchor)
  if (view === 'week') return toIsoDate(addDays(d, 7 * k))
  if (view === 'month') {
    return toIsoDate(new Date(d.getFullYear(), d.getMonth() + k, 1))
  }
  return toIsoDate(new Date(d.getFullYear() + k, 0, 1))
}

/** Nomi brevi dei giorni, da lunedì ("lun", "Mon"). */
export function weekdayShortNames(t: Pick<Dictionary, 'weekdaysLong'>) {
  return Array.from({ length: 7 }, (_, i) =>
    t.weekdaysLong[(i + 1) % 7].slice(0, 3),
  )
}

/** Etichetta del periodo mostrato fra le frecce. */
export function periodLabel(
  view: CalendarView,
  anchor: IsoDate,
  t: Names,
): string {
  const a = parseIsoDate(anchor)
  if (view === 'year') return String(a.getFullYear())
  if (view === 'month') {
    return `${capitalize(t.monthsLong[a.getMonth()])} ${a.getFullYear()}`
  }
  const [first, , , , , , last] = weekDates(anchor).map(parseIsoDate)
  const ms = t.monthsShort
  if (first.getFullYear() !== last.getFullYear()) {
    return `${first.getDate()} ${ms[first.getMonth()]} ${first.getFullYear()} – ${last.getDate()} ${ms[last.getMonth()]} ${last.getFullYear()}`
  }
  if (first.getMonth() !== last.getMonth()) {
    return `${first.getDate()} ${ms[first.getMonth()]} – ${last.getDate()} ${ms[last.getMonth()]} ${last.getFullYear()}`
  }
  return `${first.getDate()}–${last.getDate()} ${ms[last.getMonth()]} ${last.getFullYear()}`
}

/** "Lunedì 16 novembre 2026". */
export function fullDateLabel(date: IsoDate, t: Names): string {
  const d = parseIsoDate(date)
  return `${capitalize(t.weekdaysLong[d.getDay()])} ${d.getDate()} ${t.monthsLong[d.getMonth()]} ${d.getFullYear()}`
}
