import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore } from '../../data'
import type {
  Exercise,
  Id,
  IsoDate,
  Session,
  SessionStatus,
  WorkoutTemplate,
} from '../../data/types'
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
    remove,
  }
}
