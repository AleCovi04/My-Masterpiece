import type { Id, IsoDate, IsoDateTime, Session } from '../data/types'

/** Sedute di un giorno nell'ordine salvato. */
export function sessionsOn(sessions: Session[], date: IsoDate): Session[] {
  return sessions
    .filter((s) => s.date === date)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

/**
 * Sposta una seduta in `toDate` alla posizione `index` (0 = prima di tutte)
 * e rinumera l'ordine dei giorni coinvolti. `index` è riferito alla lista
 * del giorno di arrivo *senza* la seduta spostata. Se non cambia nulla
 * restituisce lo stesso array.
 */
export function moveSession(
  sessions: Session[],
  id: Id,
  toDate: IsoDate,
  index: number,
  now: IsoDateTime = new Date().toISOString(),
): Session[] {
  const moved = sessions.find((s) => s.id === id)
  if (!moved) return sessions

  const fromDate = moved.date
  const oldIndex = sessionsOn(sessions, fromDate).findIndex((s) => s.id === id)
  const target = sessionsOn(sessions, toDate).filter((s) => s.id !== id)
  const at = Math.max(0, Math.min(Math.trunc(index), target.length))
  if (fromDate === toDate && at === oldIndex) return sessions

  target.splice(at, 0, moved)
  const newOrder = new Map<Id, [IsoDate, number]>()
  target.forEach((s, i) => newOrder.set(s.id, [toDate, i]))
  if (fromDate !== toDate) {
    sessionsOn(sessions, fromDate)
      .filter((s) => s.id !== id)
      .forEach((s, i) => newOrder.set(s.id, [fromDate, i]))
  }

  return sessions.map((s) => {
    const next = newOrder.get(s.id)
    if (!next || (s.date === next[0] && s.order === next[1])) return s
    return { ...s, date: next[0], order: next[1], updatedAt: now }
  })
}
