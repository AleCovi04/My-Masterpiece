// Bozza del modulo dell'allenamento di forza: i numeri restano stringhe finché si digita.
import type { Id, TemplateEntry } from '../../data/types'
import { formatMmSs } from '../../lib/exercises'
import { newId } from '../../lib/ids'

interface DSet {
  key: string
  reps: string
  rir: string
}

export interface DEntry {
  key: string
  exerciseId: Id
  rest: string
  notes: string
  supersetId?: string
  sets: DSet[]
  /** Righe modificate a mano: "Genera serie" chiede conferma prima di sovrascriverle. */
  manual: boolean
}

export const blankSet = (): DSet => ({ key: newId(), reps: '10', rir: '2' })

/** Campo vuoto = obiettivo non indicato: è valido e resta vuoto. */
const blank = (raw: string) => raw.trim() === ''

export const parseIntIn = (
  raw: string,
  min: number,
  max: number,
): number | null => {
  const v = raw.trim()
  if (!/^\d{1,3}$/.test(v)) return null
  const n = Number(v)
  return n >= min && n <= max ? n : null
}

export const repsBad = (raw: string) =>
  !blank(raw) && parseIntIn(raw, 1, 999) === null

export const rirBad = (raw: string) =>
  !blank(raw) && parseIntIn(raw, 0, 10) === null

export const toDraft = (e: TemplateEntry): DEntry => ({
  key: newId(),
  exerciseId: e.exerciseId,
  rest: formatMmSs(e.restSeconds),
  notes: e.notes ?? '',
  supersetId: e.supersetId,
  sets: e.sets.map((s) => ({
    key: newId(),
    reps: s.reps === undefined ? '' : String(s.reps),
    rir: s.rir === undefined ? '' : String(s.rir),
  })),
  // serie diverse tra loro: sono state scritte a mano
  manual: e.sets.some(
    (s) => s.reps !== e.sets[0].reps || s.rir !== e.sets[0].rir,
  ),
})

export const setBad = (s: DSet) => repsBad(s.reps) || rirBad(s.rir)

// ---------- finestra ----------
