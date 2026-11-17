import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore } from '../../data'
import type {
  BrickActual,
  EnduranceActual,
  Exercise,
  Id,
  IsoDate,
  Session,
  SessionStatus,
  WorkoutTemplate,
} from '../../data/types'
import { clearSessionActual, setSessionActual } from '../../lib/enduranceActual'
import { createLiveWorkout, startSession } from '../../lib/liveWorkout'
import { moveSession } from '../../lib/reorder'
import {
  applyEditedPlan,
  duplicateSession,
  insertSession,
  removeSession,
  setSessionStatus,
} from '../../lib/sessions'

interface Loaded {
  sessions: Session[]
  templates: WorkoutTemplate[]
  exercises: Exercise[]
}

/**
 * Sedute del Calendario, con i template e gli esercizi che servono a crearle
 * e mostrarle. Ogni modifica viene salvata (la Panoramica le rilegge dal salvataggio).
 */
export function useCalendarSessions() {
  const [data, setData] = useState<Loaded | null>(null)
  const latest = useRef<Session[] | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      dataStore.loadSessions(),
      dataStore.loadTemplates(),
      dataStore.loadExercises(),
    ]).then(([sessions, templates, exercises]) => {
      if (cancelled) return
      latest.current = sessions
      setData({ sessions, templates, exercises })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const change = useCallback((fn: (current: Session[]) => Session[]) => {
    const current = latest.current
    if (!current) return
    const next = fn(current)
    if (next === current) return
    latest.current = next
    setData((d) => (d ? { ...d, sessions: next } : d))
    void dataStore.saveSessions(next)
  }, [])

  const move = useCallback(
    (id: Id, date: IsoDate, index: number) =>
      change((cur) => moveSession(cur, id, date, index)),
    [change],
  )

  /** Inserisce una nuova seduta esattamente alla posizione `index` del giorno. */
  const add = useCallback(
    (session: Session, date: IsoDate, index: number) =>
      change((cur) => insertSession(cur, session, date, index)),
    [change],
  )

  /** Sostituisce il piano della sola seduta con quello uscito dall'editor. */
  const editPlan = useCallback(
    (id: Id, edited: WorkoutTemplate) =>
      change((cur) =>
        cur.map((s) => (s.id === id ? applyEditedPlan(s, edited) : s)),
      ),
    [change],
  )

  /** Sposta in un'altra data, in fondo al giorno. */
  const moveToDate = useCallback(
    (id: Id, date: IsoDate) =>
      change((cur) =>
        cur.find((s) => s.id === id)?.date === date
          ? cur
          : moveSession(cur, id, date, Number.MAX_SAFE_INTEGER),
      ),
    [change],
  )

  const duplicate = useCallback(
    (id: Id) => change((cur) => duplicateSession(cur, id)),
    [change],
  )

  const setStatus = useCallback(
    (id: Id, status: SessionStatus) =>
      change((cur) => setSessionStatus(cur, id, status)),
    [change],
  )

  /**
   * Inizia la registrazione dal vivo: la seduta passa "in corso" con l'ora di
   * inizio e si crea la bozza della schermata live. Attende il salvataggio,
   * così la schermata live trova già tutto in IndexedDB.
   */
  const start = useCallback(async (id: Id) => {
    const current = latest.current
    if (!current) return
    const now = new Date().toISOString()
    const next = startSession(current, id, now)
    const session = next.find((s) => s.id === id)
    if (session?.discipline !== 'strength') return
    latest.current = next
    setData((d) => (d ? { ...d, sessions: next } : d))
    await dataStore.saveSessions(next)
    await dataStore.saveLiveWorkout(createLiveWorkout(session, now))
  }, [])

  /** Eseguito endurance inserito a mano: la seduta diventa completata. */
  const saveActual = useCallback(
    (id: Id, actual: EnduranceActual | BrickActual) =>
      change((cur) =>
        setSessionActual(cur, id, actual, new Date().toISOString()),
      ),
    [change],
  )

  /** Elimina l'eseguito endurance: la seduta torna programmata. */
  const clearActual = useCallback(
    (id: Id) =>
      change((cur) => clearSessionActual(cur, id, new Date().toISOString())),
    [change],
  )

  const remove = useCallback(
    (id: Id) => change((cur) => removeSession(cur, id)),
    [change],
  )

  return {
    sessions: data?.sessions ?? null,
    templates: data?.templates ?? [],
    exercises: data?.exercises ?? [],
    move,
    add,
    editPlan,
    moveToDate,
    duplicate,
    setStatus,
    start,
    saveActual,
    clearActual,
    remove,
  }
}
