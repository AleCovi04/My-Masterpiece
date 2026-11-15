import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore } from '../../data'
import type { Id, IsoDate, Session } from '../../data/types'
import { moveSession } from '../../lib/reorder'

/** Carica le sedute e salva ogni spostamento (la Panoramica le rilegge dal salvataggio). */
export function useCalendarSessions() {
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const latest = useRef<Session[] | null>(null)

  useEffect(() => {
    let cancelled = false
    dataStore.loadSessions().then((loaded) => {
      if (cancelled) return
      latest.current = loaded
      setSessions(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const move = useCallback((id: Id, date: IsoDate, index: number) => {
    const current = latest.current
    if (!current) return
    const next = moveSession(current, id, date, index)
    if (next === current) return
    latest.current = next
    setSessions(next)
    void dataStore.saveSessions(next)
  }, [])

  return { sessions, move }
}
