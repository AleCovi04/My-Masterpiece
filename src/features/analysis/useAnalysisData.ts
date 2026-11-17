import { useCallback, useEffect, useRef, useState } from 'react'
import { dataStore } from '../../data'
import type { BlockApplication, Exercise, Id, Session } from '../../data/types'
import { setSessionRpe } from '../../lib/load'

export interface AnalysisData {
  sessions: Session[]
  applications: BlockApplication[]
  exercises: Exercise[]
}

/** Dati dell'Analisi; l'unica modifica possibile è l'RPE mancante di una seduta. */
export function useAnalysisData(): {
  data: AnalysisData | null
  setRpe: (id: Id, rpe: number) => void
} {
  const [data, setData] = useState<AnalysisData | null>(null)
  const latest = useRef<AnalysisData | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      dataStore.loadSessions(),
      dataStore.loadApplications(),
      dataStore.loadExercises(),
    ]).then(([sessions, applications, exercises]) => {
      if (cancelled) return
      latest.current = { sessions, applications, exercises }
      setData(latest.current)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setRpe = useCallback((id: Id, rpe: number) => {
    const d = latest.current
    if (!d) return
    const now = new Date().toISOString()
    const next = { ...d, sessions: setSessionRpe(d.sessions, id, rpe, now) }
    latest.current = next
    setData(next)
    void dataStore.saveSessions(next.sessions)
  }, [])

  return { data, setRpe }
}
