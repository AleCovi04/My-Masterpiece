import type { IsoDate, Session } from '../data/types'

/** Esito di un giorno nel calendario: colore nelle viste Mese e Anno. */
export type DayStatus = 'done' | 'partial' | 'missed'

/**
 * Esito del giorno `date` rispetto a `today`.
 * - Giorno passato con sedute: tutte svolte → `done`; almeno una svolta → `partial`;
 *   nessuna svolta → `missed` (programmate rimaste indietro contano come saltate).
 * - Oggi: `done` solo se tutte svolte, altrimenti nessun esito (la giornata è in corso).
 * - Giorno di riposo (nessuna seduta) concluso: `done`, perché il riposo fa
 *   parte del piano; solo da `since` (la prima seduta) in poi, così i giorni
 *   prima di iniziare a usare l'app restano senza esito.
 * - Giorni futuri, oggi senza sedute o prima di `since`: nessun esito.
 */
export function dayStatus(
  sessions: Session[],
  date: IsoDate,
  today: IsoDate,
  since: IsoDate | null = null,
): DayStatus | null {
  if (date > today) return null
  const list = sessions.filter((s) => s.date === date)
  if (list.length === 0) {
    return since !== null && date >= since && date < today ? 'done' : null
  }
  const done = list.filter((s) => s.status === 'done').length
  if (done === list.length) return 'done'
  if (date === today) return null
  return done > 0 ? 'partial' : 'missed'
}

/** Data della prima seduta (da lì in poi i giorni di riposo contano come svolti). */
export function firstSessionDate(sessions: Session[]): IsoDate | null {
  let first: IsoDate | null = null
  for (const s of sessions) if (first === null || s.date < first) first = s.date
  return first
}
