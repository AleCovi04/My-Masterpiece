import type { IsoDate, Session } from '../data/types'

/** Esito di un giorno nel calendario: colore nelle viste Mese e Anno. */
export type DayStatus = 'done' | 'partial' | 'missed'

/**
 * Esito del giorno `date` rispetto a `today`.
 * - Giorno passato con sedute: tutte svolte → `done`; almeno una svolta → `partial`;
 *   nessuna svolta → `missed` (programmate rimaste indietro contano come saltate).
 * - Oggi: `done` solo se tutte svolte, altrimenti nessun esito (la giornata è in corso).
 * - Giorni di riposo (nessuna seduta) e giorni futuri: nessun esito.
 */
export function dayStatus(
  sessions: Session[],
  date: IsoDate,
  today: IsoDate,
): DayStatus | null {
  if (date > today) return null
  const list = sessions.filter((s) => s.date === date)
  if (list.length === 0) return null
  const done = list.filter((s) => s.status === 'done').length
  if (done === list.length) return 'done'
  if (date === today) return null
  return done > 0 ? 'partial' : 'missed'
}
